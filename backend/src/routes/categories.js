/**
 * Assessment Category Routes (Configurable per programme)
 */
export default async function categoryRoutes(fastify) {
  const { prisma } = fastify;

  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request) => {
    const { programmeId } = request.query;
    return prisma.assessmentCategory.findMany({
      where: programmeId ? { programmeId } : {},
      include: { _count: { select: { tasks: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  });

  fastify.post('/', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { name, description, programmeId, weight, scaledMaxMarks, minPassScore, sortOrder } = request.body;
    const cat = await prisma.assessmentCategory.create({
      data: {
        name,
        description,
        programmeId,
        weight: weight ?? 1.0,
        scaledMaxMarks: scaledMaxMarks ?? 80.0,
        minPassScore: minPassScore ?? 50.0,
        sortOrder: sortOrder ?? 0
      },
    });
    return reply.code(201).send(cat);
  });

  fastify.patch('/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { name, description, weight, scaledMaxMarks, minPassScore, sortOrder } = request.body;
    try {
      return await prisma.assessmentCategory.update({
        where: { id: request.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(weight !== undefined && { weight }),
          ...(scaledMaxMarks !== undefined && { scaledMaxMarks }),
          ...(minPassScore !== undefined && { minPassScore }),
          ...(sortOrder !== undefined && { sortOrder }),
        },
      });
    } catch {
      return reply.code(404).send({ error: 'Category not found' });
    }
  });

  fastify.delete('/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    try {
      await prisma.assessmentCategory.delete({ where: { id: request.params.id } });
      return { message: 'Category deleted' };
    } catch {
      return reply.code(404).send({ error: 'Category not found' });
    }
  });
}
