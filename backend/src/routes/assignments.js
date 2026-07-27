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
        scorecards: {
          select: { id: true, isSubmitted: true, totalScore: true, examiner: { select: { id: true, name: true } } },
        },
      },
      orderBy: { station: { stationCode: 'asc' } },
    });
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
