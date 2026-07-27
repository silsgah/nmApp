/**
 * Task Bank Routes
 * Updated: Tasks now have many-to-many relationships with Programmes and Year Levels
 */
export default async function taskRoutes(fastify) {
  const { prisma } = fastify;

  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request) => {
    const { programmeId, categoryId, search, isActive, yearLevel } = request.query;
    const where = {
      ...(programmeId && { programmes: { some: { programmeId } } }),
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(yearLevel && { yearLevels: { some: { yearLevel: parseInt(yearLevel) } } }),
    };
    return prisma.task.findMany({
      where,
      include: {
        programmes: {
          include: { programme: { select: { id: true, name: true } } },
        },
        yearLevels: { select: { yearLevel: true } },
        category: { select: { id: true, name: true } },
        _count: { select: { steps: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  });

  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const task = await prisma.task.findUnique({
      where: { id: request.params.id },
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
        programmes: {
          include: { programme: true },
        },
        yearLevels: { select: { yearLevel: true } },
        category: true,
      },
    });
    if (!task) return reply.code(404).send({ error: 'Task not found' });
    return task;
  });

  fastify.post('/', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { name, description, ratingScale, maxScore, programmeIds, categoryId, sortOrder, steps, yearLevels } = request.body;

    // Validate at least one programme
    if (!programmeIds || programmeIds.length === 0) {
      return reply.code(400).send({ error: 'At least one programme is required' });
    }

    const task = await prisma.task.create({
      data: {
        name, description,
        ratingScale: ratingScale || 'SCALE_0_4',
        maxScore: maxScore || 0,
        categoryId: categoryId || null,
        sortOrder: sortOrder || 0,
        programmes: {
          create: programmeIds.map((pid) => ({ programmeId: pid })),
        },
        yearLevels: yearLevels?.length ? {
          create: yearLevels.map((yl) => ({ yearLevel: parseInt(yl) })),
        } : undefined,
        steps: steps ? {
          create: steps.map((s, i) => ({
            stepNumber: s.stepNumber || i + 1,
            description: s.description,
            isKeyStep: s.isKeyStep || false,
          })),
        } : undefined,
      },
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
        programmes: { include: { programme: { select: { id: true, name: true } } } },
        yearLevels: { select: { yearLevel: true } },
      },
    });

    return reply.code(201).send(task);
  });

  fastify.patch('/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { name, description, ratingScale, maxScore, categoryId, sortOrder, isActive, programmeIds, yearLevels } = request.body;
    const taskId = request.params.id;

    try {
      // Update basic fields
      const task = await prisma.task.update({
        where: { id: taskId },
        data: { name, description, ratingScale, maxScore, categoryId, sortOrder, isActive },
        include: { steps: { orderBy: { stepNumber: 'asc' } } },
      });

      // Update programme associations if provided
      if (programmeIds) {
        await prisma.taskProgramme.deleteMany({ where: { taskId } });
        await prisma.taskProgramme.createMany({
          data: programmeIds.map((pid) => ({ taskId, programmeId: pid })),
        });
      }

      // Update year level associations if provided
      if (yearLevels) {
        await prisma.taskYearLevel.deleteMany({ where: { taskId } });
        await prisma.taskYearLevel.createMany({
          data: yearLevels.map((yl) => ({ taskId, yearLevel: parseInt(yl) })),
        });
      }

      // Return full task with updated associations
      return prisma.task.findUnique({
        where: { id: taskId },
        include: {
          steps: { orderBy: { stepNumber: 'asc' } },
          programmes: { include: { programme: { select: { id: true, name: true } } } },
          yearLevels: { select: { yearLevel: true } },
        },
      });
    } catch {
      return reply.code(404).send({ error: 'Task not found' });
    }
  });

  // Manage steps
  fastify.put('/:id/steps', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { steps } = request.body; // Full replacement of steps
    const taskId = request.params.id;

    await prisma.taskStep.deleteMany({ where: { taskId } });
    await prisma.taskStep.createMany({
      data: steps.map((s, i) => ({
        taskId,
        stepNumber: s.stepNumber || i + 1,
        description: s.description,
        isKeyStep: s.isKeyStep || false,
      })),
    });

    return prisma.task.findUnique({
      where: { id: taskId },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
  });

  fastify.delete('/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    try {
      await prisma.task.delete({ where: { id: request.params.id } });
      return { message: 'Task deleted successfully' };
    } catch (e) {
      if (e.code === 'P2003') {
        return reply.code(400).send({ error: 'Cannot delete task because it is currently assigned to one or more exam stations' });
      }
      return reply.code(404).send({ error: 'Task not found' });
    }
  });
}
