/**
 * Scorecard Routes — Examiner score entry per task/student
 */
export default async function scorecardRoutes(fastify) {
  const { prisma } = fastify;

  // GET my candidates at a station (examiner view)
  fastify.get('/my-station/:stationId', {
    onRequest: [fastify.requireRole('EXAMINER')],
  }, async (request, reply) => {
    const examinerId = request.user.id;
    const { stationId } = request.params;

    // Verify examiner is assigned to this station
    const examinerAssignment = await prisma.examinerAssignment.findUnique({
      where: { examinerId_stationId: { examinerId, stationId } },
      include: { station: { include: { session: true } } },
    });
    if (!examinerAssignment) return reply.code(403).send({ error: 'Not assigned to this station' });

    const studentAssignments = await prisma.studentAssignment.findMany({
      where: { stationId },
      include: {
        student: { select: { id: true, name: true, email: true, staffId: true, programmeId: true, yearLevel: true } },
        selectedTask: { include: { steps: { orderBy: { stepNumber: 'asc' } }, category: true } },
        scorecards: {
          where: { examinerId },
          select: { id: true, totalScore: true, percentageScore: true, isSubmitted: true, remarks: true },
        },
      },
      orderBy: { candidateNumber: 'asc' },
    });

    return {
      station: examinerAssignment.station,
      candidates: studentAssignments.map(sa => ({
        assignmentId: sa.id,
        candidateNumber: sa.candidateNumber,
        student: sa.student,
        selectedTask: sa.selectedTask,
        scorecard: sa.scorecards[0] || null,
      })),
    };
  });

  // GET /my-submitted — list all submitted scorecards for current examiner
  fastify.get('/my-submitted', {
    onRequest: [fastify.requireRole('EXAMINER')],
  }, async (request) => {
    const examinerId = request.user.id;
    return prisma.scorecard.findMany({
      where: { examinerId, isSubmitted: true },
      include: {
        studentAssignment: {
          include: {
            student: { select: { id: true, name: true, staffId: true } },
            station: {
              include: {
                task: { select: { id: true, name: true, maxScore: true } },
                session: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  });

  // GET all scorecards for a session (admin view)
  fastify.get('/session/:sessionId', {
    onRequest: [fastify.requireRole('ADMIN')],
  }, async (request) => {
    return prisma.scorecard.findMany({
      where: { studentAssignment: { station: { sessionId: request.params.sessionId } } },
      include: {
        examiner: { select: { id: true, name: true } },
        studentAssignment: {
          include: {
            student: { select: { id: true, name: true } },
            station: { include: { task: { select: { id: true, name: true } } } },
          },
        },
      },
    });
  });

  // POST save/update a scorecard (examiner enters score)
  fastify.post('/', {
    onRequest: [fastify.requireRole('EXAMINER')],
    schema: {
      body: {
        type: 'object',
        required: ['studentAssignmentId', 'examinerAssignmentId', 'totalScore'],
        properties: {
          studentAssignmentId: { type: 'string' },
          examinerAssignmentId: { type: 'string' },
          totalScore: { type: 'number', minimum: 0 },
          remarks: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const examinerId = request.user.id;
    const { studentAssignmentId, examinerAssignmentId, totalScore, remarks } = request.body;

    // Validate examiner assignment belongs to this examiner
    const examinerAssignment = await prisma.examinerAssignment.findFirst({
      where: { id: examinerAssignmentId, examinerId },
      include: { station: { include: { task: true, session: true } } },
    });
    if (!examinerAssignment) return reply.code(403).send({ error: 'Unauthorized' });

    const studentAssignment = await prisma.studentAssignment.findFirst({
      where: { id: studentAssignmentId, stationId: examinerAssignment.stationId },
      include: { selectedTask: true },
    });
    if (!studentAssignment) return reply.code(400).send({ error: 'Candidate is not assigned to this station' });
    const scoringTask = studentAssignment.selectedTask || examinerAssignment.station.task;
    if (!scoringTask) return reply.code(400).send({ error: 'Select a task for this candidate before scoring' });

    // Lock scoring if session is completed or archived
    const sessionStatus = examinerAssignment.station.session.status;
    if (['COMPLETED', 'ARCHIVED'].includes(sessionStatus)) {
      return reply.code(400).send({ error: 'This exam session is marked as completed/archived. Score modifications are locked.' });
    }

    // Check if scorecard already exists and is submitted
    const existingScorecard = await prisma.scorecard.findUnique({
      where: { studentAssignmentId_examinerAssignmentId: { studentAssignmentId, examinerAssignmentId } },
    });
    if (existingScorecard?.isSubmitted) {
      return reply.code(400).send({ error: 'Scorecard is already submitted and cannot be modified.' });
    }

    const maxPossibleScore = scoringTask.maxScore;
    const percentageScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    const scorecard = await prisma.scorecard.upsert({
      where: { studentAssignmentId_examinerAssignmentId: { studentAssignmentId, examinerAssignmentId } },
      create: {
        studentAssignmentId,
        examinerAssignmentId,
        examinerId,
        totalScore,
        maxPossibleScore,
        percentageScore,
        remarks: remarks || null,
      },
      update: {
        totalScore,
        percentageScore,
        remarks: remarks || null,
      },
    });

    return reply.code(201).send(scorecard);
  });

  // POST submit (finalise) a scorecard
  fastify.post('/:id/submit', {
    onRequest: [fastify.requireRole('EXAMINER')],
  }, async (request, reply) => {
    const scorecard = await prisma.scorecard.findFirst({
      where: { id: request.params.id, examinerId: request.user.id },
      include: { studentAssignment: { include: { station: { include: { session: true } } } } },
    });
    if (!scorecard) return reply.code(404).send({ error: 'Scorecard not found' });

    const sessionStatus = scorecard.studentAssignment?.station?.session?.status;
    if (['COMPLETED', 'ARCHIVED'].includes(sessionStatus)) {
      return reply.code(400).send({ error: 'This exam session is marked as completed/archived.' });
    }

    if (scorecard.isSubmitted) return reply.code(400).send({ error: 'Scorecard already submitted' });

    return prisma.scorecard.update({
      where: { id: request.params.id },
      data: { isSubmitted: true, submittedAt: new Date() },
    });
  });

  // POST unsubmit (admin override — resets assessment to pending)
  fastify.post('/:id/unsubmit', {
    onRequest: [fastify.requireRole('ADMIN')],
  }, async (request, reply) => {
    return prisma.scorecard.update({
      where: { id: request.params.id },
      data: { isSubmitted: false, submittedAt: null },
    });
  });

  // DELETE /scorecards/:id (admin override — deletes scorecard permanently)
  fastify.delete('/:id', {
    onRequest: [fastify.requireRole('ADMIN')],
  }, async (request, reply) => {
    await prisma.scorecard.delete({
      where: { id: request.params.id },
    });
    return reply.send({ message: 'Scorecard deleted successfully' });
  });

  // GET /assessment-matrix — per student, index, task, assigned examiner(s), assessment completion status & score
  fastify.get('/assessment-matrix', {
    onRequest: [fastify.requireRole('ADMIN')],
  }, async (request) => {
    const { sessionId, programmeId } = request.query;

    const where = {
      ...(sessionId && { station: { sessionId } }),
      ...(programmeId && { station: { session: { programmeId } } }),
    };

    const studentAssignments = await prisma.studentAssignment.findMany({
      where,
      include: {
        selectedTask: { select: { id: true, name: true, maxScore: true } },
        student: { select: { id: true, name: true, email: true, staffId: true } },
        station: {
          include: {
            task: { select: { id: true, name: true, maxScore: true } },
            session: { select: { id: true, name: true, programme: { select: { id: true, name: true, fullName: true } } } },
            examinerAssignments: {
              include: {
                examiner: { select: { id: true, name: true, staffId: true } },
              },
            },
          },
        },
        scorecards: {
          include: {
            examiner: { select: { id: true, name: true } },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
      orderBy: [
        { station: { stationCode: 'asc' } },
        { student: { name: 'asc' } },
      ],
    });

    return studentAssignments.map(sa => {
      const submittedScorecard = sa.scorecards.find(s => s.isSubmitted) || sa.scorecards[0] || null;
      return {
        assignmentId: sa.id,
        candidateNumber: sa.candidateNumber,
        student: sa.student,
        session: sa.station.session,
        station: {
          id: sa.station.id,
          stationCode: sa.station.stationCode,
          task: sa.selectedTask || sa.station.task,
        },
        assignedExaminers: sa.station.examinerAssignments.map(ea => ea.examiner),
        scorecard: submittedScorecard ? {
          id: submittedScorecard.id,
          totalScore: submittedScorecard.totalScore,
          maxPossibleScore: submittedScorecard.maxPossibleScore,
          percentageScore: submittedScorecard.percentageScore,
          isSubmitted: submittedScorecard.isSubmitted,
          submittedAt: submittedScorecard.submittedAt,
          examinerName: submittedScorecard.examiner?.name || null,
        } : null,
      };
    });
  });
}
