/**
 * Station Routes
 */
export default async function stationRoutes(fastify) {
  const { prisma } = fastify;

  fastify.post('/', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { sessionId, taskId, stationCode, categoryId, notes } = request.body;

    const station = await prisma.station.create({
      data: {
        sessionId, taskId, stationCode: stationCode.toUpperCase(), notes,
        ...(categoryId && {
          stationCategories: { create: { categoryId } },
        }),
      },
      include: {
        task: { include: { category: true } },
        stationCategories: { include: { category: true } },
      },
    });

    return reply.code(201).send(station);
  });

  fastify.post('/bulk', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { sessionId, stations } = request.body;
    const created = [];

    for (const s of stations) {
      const station = await prisma.station.create({
        data: {
          sessionId,
          taskId: s.taskId,
          stationCode: s.stationCode.toUpperCase(),
          notes: s.notes || null,
          ...(s.categoryId && {
            stationCategories: { create: { categoryId: s.categoryId } },
          }),
        },
        include: { task: { select: { id: true, name: true } } },
      });
      created.push(station);
    }

    return reply.code(201).send({ created, count: created.length });
  });

  fastify.patch('/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { stationCode, notes, categoryId } = request.body;
    try {
      const station = await prisma.station.update({
        where: { id: request.params.id },
        data: {
          ...(stationCode && { stationCode: stationCode.toUpperCase() }),
          ...(notes !== undefined && { notes }),
        },
        include: { task: true, stationCategories: { include: { category: true } } },
      });
      return station;
    } catch {
      return reply.code(404).send({ error: 'Station not found' });
    }
  });

  fastify.delete('/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    try {
      await prisma.station.delete({ where: { id: request.params.id } });
      return { message: 'Station deleted' };
    } catch {
      return reply.code(404).send({ error: 'Station not found' });
    }
  });
}
