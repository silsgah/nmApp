import { assertAttemptCanBeAdded, isUniqueConstraintConflict } from '../lib/task-attempt-policy.js';

/**
 * Assignment Routes (Student & Examiner to Stations)
 */
export default async function assignmentRoutes(fastify) {
  const { prisma } = fastify;

  // ── Student Assignments ────────────────────────────────────────────────
  fastify.get('/students', { onRequest: [fastify.authenticate] }, async (request) => {
    const { stationId, sessionId, studentId } = request.query;
    const user = request.user;

    const where = {
      ...(stationId && { stationId }),
      ...(sessionId && { station: { sessionId } }),
      // Students can only see their own assignments
      ...(user.role === 'STUDENT' ? { studentId: user.id } : studentId && { studentId }),
    };

    return prisma.studentAssignment.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true, staffId: true } },
        station: {
          include: {
            task: { select: { id: true, name: true, ratingScale: true, maxScore: true } },
            stationCategories: { include: { category: true } },
          },
        },
        selectedTask: {
          include: {
            steps: { orderBy: { stepNumber: 'asc' } },
            category: true,
          },
        },
        scorecards: {
          select: { id: true, isSubmitted: true, totalScore: true, examiner: { select: { id: true, name: true } } },
        },
      },
      orderBy: { station: { stationCode: 'asc' } },
    });
  });

  // Select the task shared by every examiner assessing this candidate at this station.
  // The first selection wins; an admin must reset it after any scoring has started.
  fastify.post('/students/:id/select-task', { onRequest: [fastify.requireRole('EXAMINER', 'ADMIN')] }, async (request, reply) => {
    const assignment = await prisma.studentAssignment.findUnique({
      where: { id: request.params.id },
      include: {
        student: true,
        station: { include: { session: true, examinerAssignments: true } },
      },
    });
    if (!assignment) return reply.code(404).send({ error: 'Student assignment not found' });

    if (request.user.role === 'EXAMINER' && !assignment.station.examinerAssignments.some((ea) => ea.examinerId === request.user.id)) {
      return reply.code(403).send({ error: 'You are not assigned to this station' });
    }
    const task = await prisma.task.findFirst({
      where: {
        id: request.body.taskId,
        isActive: true,
        programmes: { some: { programmeId: assignment.student.programmeId } },
        ...(assignment.student.yearLevel && { yearLevels: { some: { yearLevel: assignment.student.yearLevel } } }),
      },
      include: { steps: { orderBy: { stepNumber: 'asc' } }, category: true },
    });
    if (!task) return reply.code(400).send({ error: 'Task is not available for this student programme and year level' });

    const latestAttempt = await prisma.taskAttempt.findFirst({
      where: { studentAssignmentId: assignment.id, status: { in: ['ACTIVE', 'REOPENED'] } },
      include: { scorecards: true },
      orderBy: { sequence: 'desc' },
    });
    if (latestAttempt) {
      const expected = assignment.station.examinerAssignments.length;
      const submitted = latestAttempt.scorecards.filter((scorecard) => scorecard.isSubmitted).length;
      try { assertAttemptCanBeAdded({ assignedExaminerCount: expected, submittedExaminerCount: submitted, hasCurrentAttempt: true }); }
      catch (error) { return reply.code(409).send({ error: error.message }); }
    } else if (assignment.station.examinerAssignments.length < 1) {
      return reply.code(409).send({ error: 'At least one examiner must be assigned before selecting a task.' });
    }

    try {
      const attempt = await prisma.$transaction(async (tx) => {
        const sequence = (await tx.taskAttempt.count({ where: { studentAssignmentId: assignment.id } })) + 1;
        const created = await tx.taskAttempt.create({
          data: {
            studentAssignmentId: assignment.id,
            taskId: task.id,
            studentId: assignment.studentId,
            sessionId: assignment.station.sessionId,
            sequence,
            categoryWeight: task.category?.weight ?? 1,
            selectedById: request.user.id,
          },
          include: { task: { include: { steps: { orderBy: { stepNumber: 'asc' } }, category: true } } },
        });
        await tx.studentAssignment.update({
          where: { id: assignment.id },
          data: { selectedTaskId: task.id, taskSelectedById: request.user.id, taskSelectedAt: new Date() },
        });
        return created;
      });
      return { task: attempt.task, attempt };
    } catch (error) {
      if (isUniqueConstraintConflict(error)) return reply.code(409).send({ error: 'This student has already performed that task in this examination session, or another examiner selected an attempt at the same time. Refresh and continue.' });
      throw error;
    }
  });

  fastify.post('/task-attempts/:id/reopen', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const reason = String(request.body?.reason || '').trim();
    if (reason.length < 10) return reply.code(400).send({ error: 'A reopening reason of at least 10 characters is required' });
    const attempt = await prisma.taskAttempt.findUnique({ where: { id: request.params.id }, include: { scorecards: true, task: true } });
    if (!attempt) return reply.code(404).send({ error: 'Task attempt not found' });
    return prisma.$transaction(async (tx) => {
      await tx.assessmentAudit.create({ data: { taskAttemptId: attempt.id, action: 'REOPENED', reason, actorId: request.user.id, snapshot: { task: attempt.task, scorecards: attempt.scorecards } } });
      const publishedResults = await tx.studentResult.findMany({ where: { sessionId: attempt.sessionId, status: 'PUBLISHED' }, select: { id: true, overallPercent: true, publishedAt: true } });
      if (publishedResults.length > 0) {
        await tx.resultPublicationAudit.create({ data: { sessionId: attempt.sessionId, action: 'AUTO_UNPUBLISHED_FOR_REOPEN', reason, actorId: request.user.id, snapshot: { taskAttemptId: attempt.id, results: publishedResults } } });
        await tx.studentResult.updateMany({ where: { sessionId: attempt.sessionId }, data: { status: 'PENDING', publishedAt: null } });
      }
      await tx.scorecard.updateMany({ where: { taskAttemptId: attempt.id }, data: { isSubmitted: false, submittedAt: null } });
      return tx.taskAttempt.update({ where: { id: attempt.id }, data: { status: 'REOPENED', reopenedAt: new Date() } });
    });
  });

  fastify.post('/task-attempts/:id/archive', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const reason = String(request.body?.reason || '').trim();
    if (reason.length < 10) return reply.code(400).send({ error: 'An archive reason of at least 10 characters is required' });
    const attempt = await prisma.taskAttempt.findUnique({ where: { id: request.params.id }, include: { scorecards: true, task: true } });
    if (!attempt) return reply.code(404).send({ error: 'Task attempt not found' });
    return prisma.$transaction(async (tx) => {
      await tx.assessmentAudit.create({ data: { taskAttemptId: attempt.id, action: 'ARCHIVED', reason, actorId: request.user.id, snapshot: { task: attempt.task, scorecards: attempt.scorecards } } });
      return tx.taskAttempt.update({ where: { id: attempt.id }, data: { status: 'ARCHIVED', archivedAt: new Date() } });
    });
  });

  fastify.delete('/students/:id/selected-task', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    return reply.code(410).send({ error: 'Use the audited archive or reopen action for a task attempt.' });
  });

  fastify.post('/students', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { studentId, stationId, candidateNumber } = request.body;

    const existing = await prisma.studentAssignment.findUnique({
      where: { studentId_stationId: { studentId, stationId } },
    });
    if (existing) return reply.code(409).send({ error: 'Student already assigned to this station' });

    const assignment = await prisma.studentAssignment.create({
      data: { studentId, stationId, candidateNumber },
      include: {
        student: { select: { id: true, name: true, email: true, staffId: true } },
        station: { include: { task: { select: { id: true, name: true } } } },
      },
    });
    return reply.code(201).send(assignment);
  });

  fastify.post('/students/bulk', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { assignments } = request.body; // [{ studentId, stationId, candidateNumber }]
    const results = { created: 0, skipped: 0 };

    for (const a of assignments) {
      const existing = await prisma.studentAssignment.findUnique({
        where: { studentId_stationId: { studentId: a.studentId, stationId: a.stationId } },
      });
      if (existing) { results.skipped++; continue; }

      await prisma.studentAssignment.create({
        data: { studentId: a.studentId, stationId: a.stationId, candidateNumber: a.candidateNumber },
      });
      results.created++;
    }

    return results;
  });

  fastify.delete('/students/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    try {
      await prisma.studentAssignment.delete({ where: { id: request.params.id } });
      return { message: 'Assignment removed' };
    } catch {
      return reply.code(404).send({ error: 'Assignment not found' });
    }
  });

  // ── Examiner Assignments ────────────────────────────────────────────────
  fastify.get('/examiners', { onRequest: [fastify.authenticate] }, async (request) => {
    const { stationId, sessionId, examinerId } = request.query;
    const user = request.user;

    const where = {
      ...(stationId && { stationId }),
      ...(sessionId && { station: { sessionId } }),
      ...(user.role === 'EXAMINER' ? { examinerId: user.id } : examinerId && { examinerId }),
    };

    return prisma.examinerAssignment.findMany({
      where,
      include: {
        examiner: { select: { id: true, name: true, staffId: true } },
        station: {
          include: {
            task: { select: { id: true, name: true, ratingScale: true, maxScore: true } },
            session: { select: { id: true, name: true, status: true } },
            _count: { select: { studentAssignments: true } },
          },
        },
        scorecards: { select: { id: true, isSubmitted: true } },
      },
    });
  });

  fastify.post('/examiners', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { examinerId, stationId } = request.body;
    const assignment = await prisma.examinerAssignment.create({
      data: { examinerId, stationId },
      include: {
        examiner: { select: { id: true, name: true } },
        station: { include: { task: { select: { id: true, name: true } } } },
      },
    });
    return reply.code(201).send(assignment);
  });

  fastify.delete('/examiners/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    try {
      await prisma.examinerAssignment.delete({ where: { id: request.params.id } });
      return { message: 'Examiner assignment removed' };
    } catch {
      return reply.code(404).send({ error: 'Assignment not found' });
    }
  });
}
