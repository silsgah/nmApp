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
      include: { station: { include: { task: { include: { steps: { orderBy: { stepNumber: 'asc' } } } } } } },
    });
    if (!examinerAssignment) return reply.code(403).send({ error: 'Not assigned to this station' });

    const studentAssignments = await prisma.studentAssignment.findMany({
      where: { stationId },
      include: {
        student: { select: { id: true, name: true, email: true } },
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
      include: { station: { include: { task: true } } },
    });
    if (!examinerAssignment) return reply.code(403).send({ error: 'Unauthorized' });

    const maxPossibleScore = examinerAssignment.station.task.maxScore;
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
    });
    if (!scorecard) return reply.code(404).send({ error: 'Scorecard not found' });
    if (scorecard.isSubmitted) return reply.code(400).send({ error: 'Scorecard already submitted' });

    return prisma.scorecard.update({
      where: { id: request.params.id },
      data: { isSubmitted: true, submittedAt: new Date() },
    });
  });

  // POST unsubmit (admin override)
  fastify.post('/:id/unsubmit', {
    onRequest: [fastify.requireRole('ADMIN')],
  }, async (request, reply) => {
    return prisma.scorecard.update({
      where: { id: request.params.id },
      data: { isSubmitted: false, submittedAt: null },
    });
  });
}
