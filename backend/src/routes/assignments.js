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
    if (assignment.selectedTaskId && assignment.selectedTaskId !== request.body.taskId) {
      return reply.code(409).send({ error: 'A task has already been selected for this candidate. An administrator must reset it.' });
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

    const selected = await prisma.studentAssignment.updateMany({
      where: { id: assignment.id, OR: [{ selectedTaskId: null }, { selectedTaskId: task.id }] },
      data: { selectedTaskId: task.id, taskSelectedById: request.user.id, taskSelectedAt: new Date() },
    });
    if (selected.count !== 1) return reply.code(409).send({ error: 'Another examiner selected a task first. Refresh to continue with the shared task.' });
    return { task };
  });

  fastify.delete('/students/:id/selected-task', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const scoreCount = await prisma.scorecard.count({ where: { studentAssignmentId: request.params.id } });
    if (scoreCount > 0) return reply.code(409).send({ error: 'Remove or unsubmit existing scorecards before resetting the task' });
    await prisma.studentAssignment.update({
      where: { id: request.params.id },
      data: { selectedTaskId: null, taskSelectedById: null, taskSelectedAt: null },
    });
    return { message: 'Selected task reset' };
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
