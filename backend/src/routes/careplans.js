/**
 * Care Plan Routes — Configurable care plan types and scoring
 *
 * Care Plan Types (admin):
 *   GET    /api/v1/care-plans/types?programmeId=
 *   POST   /api/v1/care-plans/types
 *   PATCH  /api/v1/care-plans/types/:id
 *   DELETE /api/v1/care-plans/types/:id
 *
 * Care Plan Scores (examiner/admin):
 *   GET    /api/v1/care-plans/scores/:sessionId
 *   GET    /api/v1/care-plans/scores/:sessionId/student/:studentId
 *   POST   /api/v1/care-plans/scores   (upsert a score)
 *   POST   /api/v1/care-plans/scores/batch  (submit all types for a student at once)
 */
export default async function carePlanRoutes(fastify) {
  const { prisma } = fastify;

  // ── Care Plan Types (configurable per programme) ──

  fastify.get('/types', { onRequest: [fastify.authenticate] }, async (request) => {
    const { programmeId } = request.query;
    return prisma.carePlanType.findMany({
      where: programmeId ? { programmeId } : {},
      include: { programme: { select: { id: true, name: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  });

  fastify.post('/types', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { name, programmeId, maxMarks, sortOrder } = request.body;
    if (!name || !programmeId) {
      return reply.code(400).send({ error: 'name and programmeId are required' });
    }
    const type = await prisma.carePlanType.create({
      data: { name, programmeId, maxMarks: maxMarks ?? 10.0, sortOrder: sortOrder ?? 0 },
    });
    return reply.code(201).send(type);
  });

  fastify.patch('/types/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { name, maxMarks, sortOrder } = request.body;
    try {
      return await prisma.carePlanType.update({
        where: { id: request.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(maxMarks !== undefined && { maxMarks }),
          ...(sortOrder !== undefined && { sortOrder }),
        },
      });
    } catch {
      return reply.code(404).send({ error: 'Care plan type not found' });
    }
  });

  fastify.delete('/types/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    try {
      // Delete associated scores first
      await prisma.carePlanScore.deleteMany({ where: { carePlanTypeId: request.params.id } });
      await prisma.carePlanType.delete({ where: { id: request.params.id } });
      return { message: 'Care plan type deleted' };
    } catch {
      return reply.code(404).send({ error: 'Care plan type not found' });
    }
  });

  // ── Care Plan Scores ──

  // Get all care plan scores for a session (admin view)
  fastify.get('/scores/:sessionId', { onRequest: [fastify.authenticate] }, async (request) => {
    const { sessionId } = request.params;
    return prisma.carePlanScore.findMany({
      where: { sessionId },
      include: {
        student: { select: { id: true, name: true, email: true, staffId: true } },
        carePlanType: true,
        examiner: { select: { id: true, name: true } },
      },
      orderBy: [{ student: { name: 'asc' } }, { carePlanType: { sortOrder: 'asc' } }],
    });
  });

  // Get a specific student's care plan scores for a session
  fastify.get('/scores/:sessionId/student/:studentId', { onRequest: [fastify.authenticate] }, async (request) => {
    const { sessionId, studentId } = request.params;
    return prisma.carePlanScore.findMany({
      where: { sessionId, studentId },
      include: {
        carePlanType: true,
        examiner: { select: { id: true, name: true } },
      },
      orderBy: { carePlanType: { sortOrder: 'asc' } },
    });
  });

  // Upsert a single care plan score
  fastify.post('/scores', { onRequest: [fastify.requireRole('ADMIN', 'EXAMINER')] }, async (request, reply) => {
    const { studentId, sessionId, carePlanTypeId, marks } = request.body;
    const examinerId = request.user.id;

    if (!studentId || !sessionId || !carePlanTypeId || marks == null) {
      return reply.code(400).send({ error: 'studentId, sessionId, carePlanTypeId, and marks are required' });
    }

    // Validate marks don't exceed maxMarks
    const planType = await prisma.carePlanType.findUnique({ where: { id: carePlanTypeId } });
    if (!planType) return reply.code(404).send({ error: 'Care plan type not found' });
    if (marks < 0 || marks > planType.maxMarks) {
      return reply.code(400).send({ error: `Marks must be between 0 and ${planType.maxMarks}` });
    }

    const score = await prisma.carePlanScore.upsert({
      where: {
        studentId_sessionId_carePlanTypeId: { studentId, sessionId, carePlanTypeId },
      },
      create: { studentId, sessionId, carePlanTypeId, examinerId, marks },
      update: { marks, examinerId, submittedAt: new Date() },
      include: { carePlanType: true },
    });

    return reply.code(200).send(score);
  });

  // Batch submit all care plan types for a student at once
  fastify.post('/scores/batch', { onRequest: [fastify.requireRole('ADMIN', 'EXAMINER')] }, async (request, reply) => {
    const { studentId, sessionId, scores } = request.body;
    // scores = [{ carePlanTypeId, marks }, ...]
    const examinerId = request.user.id;

    if (!studentId || !sessionId || !scores?.length) {
      return reply.code(400).send({ error: 'studentId, sessionId, and scores array are required' });
    }

    // Validate all scores
    const typeIds = scores.map(s => s.carePlanTypeId);
    const types = await prisma.carePlanType.findMany({ where: { id: { in: typeIds } } });
    const typeMap = Object.fromEntries(types.map(t => [t.id, t]));

    for (const s of scores) {
      const planType = typeMap[s.carePlanTypeId];
      if (!planType) return reply.code(400).send({ error: `Invalid care plan type: ${s.carePlanTypeId}` });
      if (s.marks < 0 || s.marks > planType.maxMarks) {
        return reply.code(400).send({ error: `${planType.name}: marks must be between 0 and ${planType.maxMarks}` });
      }
    }

    const results = await Promise.all(
      scores.map(s =>
        prisma.carePlanScore.upsert({
          where: {
            studentId_sessionId_carePlanTypeId: {
              studentId, sessionId, carePlanTypeId: s.carePlanTypeId,
            },
          },
          create: { studentId, sessionId, carePlanTypeId: s.carePlanTypeId, examinerId, marks: s.marks },
          update: { marks: s.marks, examinerId, submittedAt: new Date() },
          include: { carePlanType: true },
        })
      )
    );

    return { message: `Saved ${results.length} care plan scores`, scores: results };
  });
}
