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
    if (!String(name || '').trim() || !programmeId) return reply.code(400).send({ error: 'Category name and programme are required' });
    if (!Number.isFinite(scaledMaxMarks) || scaledMaxMarks <= 0 || scaledMaxMarks > 200) return reply.code(400).send({ error: 'Marks per task must be between 1 and 200' });
    if (!Number.isFinite(minPassScore) || minPassScore < 0 || minPassScore > 100) return reply.code(400).send({ error: 'Minimum pass percentage must be between 0 and 100' });
    const cat = await prisma.assessmentCategory.create({
      data: {
        name: String(name).trim(),
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
    if (scaledMaxMarks !== undefined && (!Number.isFinite(scaledMaxMarks) || scaledMaxMarks <= 0 || scaledMaxMarks > 200)) return reply.code(400).send({ error: 'Marks per task must be between 1 and 200' });
    if (minPassScore !== undefined && (!Number.isFinite(minPassScore) || minPassScore < 0 || minPassScore > 100)) return reply.code(400).send({ error: 'Minimum pass percentage must be between 0 and 100' });
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
      const category = await prisma.assessmentCategory.findUnique({ where: { id: request.params.id }, include: { _count: { select: { tasks: true, stationCategories: true } } } });
      if (!category) return reply.code(404).send({ error: 'Category not found' });
      if (category._count.tasks > 0 || category._count.stationCategories > 0) return reply.code(409).send({ error: 'This category is already used by tasks or stations and cannot be removed' });
      await prisma.assessmentCategory.delete({ where: { id: request.params.id } });
      return { message: 'Category deleted' };
    } catch {
      return reply.code(409).send({ error: 'Category could not be removed' });
    }
  });
}
