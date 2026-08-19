import { requireAssessmentAccess, requireOpenSession } from '../lib/assessment-access.js';

/** Independent Obstetric examination: configurable dependent options and scoring. */
export default async function obstetricRoutes(fastify) {
  const { prisma } = fastify;

  fastify.get('/options', { onRequest: [fastify.authenticate] }, async (request) => {
    const { programmeId } = request.query;
    return prisma.obstetricOption.findMany({
      where: { ...(programmeId && { programmeId }), isActive: true },
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  });

  fastify.post('/options', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { name, programmeId, parentId, maxMarks = 15, sortOrder = 0 } = request.body;
    if (!name?.trim() || !programmeId) return reply.code(400).send({ error: 'name and programmeId are required' });
    return reply.code(201).send(await prisma.obstetricOption.create({ data: { name: name.trim(), programmeId, parentId: parentId || null, maxMarks, sortOrder } }));
  });

  fastify.get('/evaluations/:sessionId/student/:studentId', { onRequest: [fastify.requireRole('ADMIN', 'EXAMINER')] }, async (request, reply) => {
    if (!await requireAssessmentAccess(prisma, request, reply, { sessionId: request.params.sessionId, studentId: request.params.studentId })) return;
    const evaluation = await prisma.obstetricEvaluation.findUnique({
      where: { studentId_sessionId_examinerId: { studentId: request.params.studentId, sessionId: request.params.sessionId, examinerId: request.user.id } },
      include: { selections: { include: { option: true }, orderBy: { slot: 'asc' } } },
    });
    return evaluation || reply.code(404).send({ error: 'Obstetric evaluation not found' });
  });

  fastify.post('/evaluations', { onRequest: [fastify.requireRole('ADMIN', 'EXAMINER')] }, async (request, reply) => {
    const { studentId, sessionId, anatomyMarks, abnormalPregnancyMarks, selections, isSubmitted = true } = request.body;
    if (!studentId || !sessionId || !Array.isArray(selections) || selections.length !== 2) return reply.code(400).send({ error: 'Student, session, and exactly two optional selections are required' });
    if (!await requireAssessmentAccess(prisma, request, reply, { sessionId, studentId })) return;
    if (!await requireOpenSession(prisma, reply, sessionId)) return;
    const compulsory = [Number(anatomyMarks), Number(abnormalPregnancyMarks)];
    if (compulsory.some((mark) => !Number.isFinite(mark) || mark < 0 || mark > 15)) return reply.code(400).send({ error: 'Each compulsory mark must be between 0 and 15' });
    if (new Set(selections.map((selection) => selection.optionId)).size !== 2) return reply.code(400).send({ error: 'Select two different optional items' });

    const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
    const student = session && await prisma.user.findFirst({ where: { id: studentId, role: 'STUDENT', programmeId: session.programmeId } });
    if (!session || !student) return reply.code(400).send({ error: 'Student is not eligible for this session' });
    const options = await prisma.obstetricOption.findMany({ where: { id: { in: selections.map((selection) => selection.optionId) }, programmeId: session.programmeId, isActive: true } });
    if (options.length !== 2) return reply.code(400).send({ error: 'An optional item is invalid for this programme' });
    const optionMap = Object.fromEntries(options.map((option) => [option.id, option]));
    for (const selection of selections) {
      const marks = Number(selection.marks);
      if (!Number.isFinite(marks) || marks < 0 || marks > optionMap[selection.optionId].maxMarks) return reply.code(400).send({ error: `Invalid marks for ${optionMap[selection.optionId].name}` });
    }
    const totalScore = compulsory[0] + compulsory[1] + selections.reduce((sum, selection) => sum + Number(selection.marks), 0);
    const maxScore = 30 + options.reduce((sum, option) => sum + option.maxMarks, 0);
    const result = await prisma.$transaction(async (tx) => {
      const evaluation = await tx.obstetricEvaluation.upsert({
        where: { studentId_sessionId_examinerId: { studentId, sessionId, examinerId: request.user.id } },
        create: { studentId, sessionId, examinerId: request.user.id, anatomyMarks: compulsory[0], abnormalPregnancyMarks: compulsory[1], totalScore, maxScore, isSubmitted, submittedAt: isSubmitted ? new Date() : null },
        update: { anatomyMarks: compulsory[0], abnormalPregnancyMarks: compulsory[1], totalScore, maxScore, isSubmitted, submittedAt: isSubmitted ? new Date() : null },
      });
      await tx.obstetricSelection.deleteMany({ where: { evaluationId: evaluation.id } });
      await tx.obstetricSelection.createMany({ data: selections.map((selection, index) => ({ evaluationId: evaluation.id, slot: index + 1, optionId: selection.optionId, marks: Number(selection.marks) })) });
      return tx.obstetricEvaluation.findUnique({ where: { id: evaluation.id }, include: { selections: { include: { option: true }, orderBy: { slot: 'asc' } } } });
    });
    return reply.send(result);
  });
}
