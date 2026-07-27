/**
 * Programme Routes
 * GET  /api/v1/programmes
 * POST /api/v1/programmes
 * GET  /api/v1/programmes/:id
 * PATCH /api/v1/programmes/:id
 */
export default async function programmeRoutes(fastify) {
  const { prisma } = fastify;

  fastify.get('/', { onRequest: [fastify.authenticate] }, async () => {
    return prisma.programme.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { taskProgrammes: true, examSessions: true, users: true } },
      },
    });
  });

  fastify.post('/', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { name, fullName, description } = request.body;
    const prog = await prisma.programme.create({ data: { name, fullName, description } });
    return reply.code(201).send(prog);
  });

  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const prog = await prisma.programme.findUnique({
      where: { id: request.params.id },
      include: { assessmentCategories: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!prog) return reply.code(404).send({ error: 'Programme not found' });
    return prog;
  });

  fastify.patch('/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { name, fullName, description } = request.body;
    try {
      return await prisma.programme.update({
        where: { id: request.params.id },
        data: { name, fullName, description },
      });
    } catch {
      return reply.code(404).send({ error: 'Programme not found' });
    }
  });
}
