import { validateExaminationReset } from '../lib/examination-reset-policy.js';
import { evaluateStudentEligibility, validateScheduleSelection } from '../lib/schedule-policy.js';

/**
 * Exam Session Routes
 */
export default async function sessionRoutes(fastify) {
  const { prisma } = fastify;

  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request) => {
    const { programmeId, status, activeOnly, page, limit, search } = request.query;
    const user = request.user;

    let statusFilter;
    if (status) {
      statusFilter = status;
    } else if (activeOnly === 'true' || activeOnly === true) {
      statusFilter = { in: ['ACTIVE', 'MARKING', 'COMPLETED'] };
    } else if (user.role === 'EXAMINER') {
      statusFilter = { in: ['ACTIVE', 'MARKING'] };
    } else if (user.role === 'STUDENT') {
      statusFilter = { in: ['ACTIVE', 'MARKING', 'COMPLETED'] };
    }

    const where = {
      ...(programmeId && { programmeId }),
      ...(statusFilter && { status: statusFilter }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { academicYear: { contains: search, mode: 'insensitive' } },
          { programme: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const include = {
      programme: { select: { id: true, name: true, fullName: true } },
      config: true,
      _count: { select: { stations: true } },
    };

    // Preserve the existing array response for consumers that do not request pagination.
    if (!page && !limit) return prisma.examSession.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
    });

    const currentPage = Math.max(parseInt(page || '1'), 1);
    const pageSize = Math.min(Math.max(parseInt(limit || '9'), 1), 100);
    const [data, total] = await prisma.$transaction([
      prisma.examSession.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (currentPage - 1) * pageSize, take: pageSize }),
      prisma.examSession.count({ where }),
    ]);
    return { data, pagination: { page: currentPage, limit: pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) } };
  });

  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const session = await prisma.examSession.findUnique({
      where: { id: request.params.id },
      include: {
        programme: true,
        config: true,
        stations: {
          include: {
            task: { include: { category: true } },
            _count: {
              select: { studentAssignments: true, examinerAssignments: true },
            },
          },
          orderBy: { stationCode: 'asc' },
        },
      },
    });
    if (!session) return reply.code(404).send({ error: 'Session not found' });
    return session;
  });

  fastify.post('/', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { name, semester, academicYear, programmeId, yearLevel, startDate, endDate, config } = request.body;

    const session = await prisma.examSession.create({
      data: {
        name, semester, academicYear, programmeId,
        yearLevel: yearLevel ? parseInt(yearLevel) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        config: config ? {
          create: {
            examinerCount: config.examinerCount ?? 3,
            overallPassMark: config.overallPassMark ?? 50.0,
            practicalMaxMarks: config.practicalMaxMarks ?? 80.0,
            scoreAggregation: config.scoreAggregation ?? 'AVERAGE',
            categoryWeights: config.categoryWeights ?? null,
            categoryPassMarks: config.categoryPassMarks ?? null,
          },
        } : {
          create: { examinerCount: 3, overallPassMark: 50.0, practicalMaxMarks: 80.0, scoreAggregation: 'AVERAGE' },
        },
      },
      include: { config: true, programme: true },
    });

    return reply.code(201).send(session);
  });

  fastify.patch('/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { name, semester, academicYear, status, startDate, endDate, yearLevel } = request.body;
    try {
      return await prisma.examSession.update({
        where: { id: request.params.id },
        data: {
          ...(name && { name }),
          ...(semester && { semester }),
          ...(academicYear && { academicYear }),
          ...(status && { status }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          ...(yearLevel !== undefined && { yearLevel: yearLevel ? parseInt(yearLevel) : null }),
        },
        include: { config: true, programme: true },
      });
    } catch {
      return reply.code(404).send({ error: 'Session not found' });
    }
  });

  fastify.delete('/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const session = await prisma.examSession.findUnique({
      where: { id: request.params.id },
      include: {
        _count: { select: { stations: true, results: true, carePlanScores: true, caseStudyEvaluations: true, obstetricEvaluations: true } },
      },
    });
    if (!session) return reply.code(404).send({ error: 'Session not found' });
    const hasRecords = Object.values(session._count).some((count) => count > 0);
    if (hasRecords) {
      return reply.code(409).send({ error: 'This session contains stations or examination records and cannot be deleted. Archive it instead to preserve the audit trail.' });
    }
    await prisma.$transaction([
      prisma.examConfig.deleteMany({ where: { sessionId: session.id } }),
      prisma.examSession.delete({ where: { id: session.id } }),
    ]);
    return reply.send({ message: 'Session deleted successfully' });
  });

  // Update exam config
  fastify.patch('/:id/config', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const { examinerCount, overallPassMark, practicalMaxMarks, scoreAggregation, categoryWeights, categoryPassMarks } = request.body;
    try {
      return await prisma.examConfig.upsert({
        where: { sessionId: request.params.id },
        create: {
          sessionId: request.params.id,
          examinerCount: examinerCount ?? 3,
          overallPassMark: overallPassMark ?? 50.0,
          practicalMaxMarks: practicalMaxMarks ?? 80.0,
          scoreAggregation: scoreAggregation ?? 'AVERAGE',
          categoryWeights: categoryWeights ?? null,
          categoryPassMarks: categoryPassMarks ?? null,
        },
        update: {
          ...(examinerCount !== undefined && { examinerCount }),
          ...(overallPassMark !== undefined && { overallPassMark }),
          ...(practicalMaxMarks !== undefined && { practicalMaxMarks }),
          ...(scoreAggregation && { scoreAggregation }),
          ...(categoryWeights !== undefined && { categoryWeights }),
          ...(categoryPassMarks !== undefined && { categoryPassMarks }),
        },
      });
    } catch {
      return reply.code(404).send({ error: 'Session not found' });
    }
  });

  // Session status transitions: activate, start marking, complete
  fastify.post('/:id/activate', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    return prisma.examSession.update({
      where: { id: request.params.id },
      data: { status: 'ACTIVE' },
    });
  });

  fastify.post('/:id/start-marking', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    return prisma.examSession.update({
      where: { id: request.params.id },
      data: { status: 'MARKING' },
    });
  });

  fastify.post('/:id/complete', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    return prisma.examSession.update({
      where: { id: request.params.id },
      data: { status: 'COMPLETED' },
    });
  });

  async function getScheduleOptions(session) {
    const taskWhere = {
      isActive: true,
      programmes: { some: { programmeId: session.programmeId } },
      ...(session.yearLevel != null && { yearLevels: { some: { yearLevel: session.yearLevel } } }),
    };
    const [students, examiners, eligibleTaskCount] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'STUDENT', programmeId: session.programmeId },
        select: { id: true, name: true, staffId: true, programmeId: true, yearLevel: true, isActive: true },
        orderBy: [{ staffId: 'asc' }, { name: 'asc' }],
      }),
      prisma.user.findMany({
        where: { role: 'EXAMINER', programmeId: session.programmeId, isActive: true },
        select: { id: true, name: true, staffId: true },
        orderBy: { name: 'asc' },
      }),
      prisma.task.count({ where: taskWhere }),
    ]);
    const assessed = students.map((student) => ({ ...student, ...evaluateStudentEligibility(student, session, eligibleTaskCount) }));
    return {
      students: assessed.filter((student) => student.eligible),
      excludedStudents: assessed.filter((student) => !student.eligible),
      examiners,
      eligibleTaskCount,
    };
  }

  fastify.get('/:id/schedule-options', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const session = await prisma.examSession.findUnique({ where: { id: request.params.id }, include: { stations: true, config: true } });
    if (!session) return reply.code(404).send({ error: 'Session not found' });
    return { ...(await getScheduleOptions(session)), stationCount: session.stations.length, examinerCount: session.config?.examinerCount ?? 3 };
  });

  // Assign only the candidates and examiners explicitly approved by the administrator.
  fastify.post('/:id/auto-assign', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const session = await prisma.examSession.findUnique({
      where: { id: request.params.id },
      include: { config: true, stations: true },
    });

    if (!session) return reply.code(404).send({ error: 'Session not found' });
    if (session.status !== 'DRAFT') {
      return reply.code(400).send({ error: 'Scheduling is only allowed for sessions in DRAFT status' });
    }
    if (!session.stations || session.stations.length === 0) {
      return reply.code(400).send({ error: 'Cannot generate schedule for a session with no stations. Please add at least one station first.' });
    }

    const options = await getScheduleOptions(session);
    const studentIds = request.body?.studentIds;
    const examinerIds = request.body?.examinerIds;
    try {
      validateScheduleSelection({
        eligibleStudentIds: options.students.map((student) => student.id),
        eligibleExaminerIds: options.examiners.map((examiner) => examiner.id),
        studentIds,
        examinerIds,
      });
    } catch (error) {
      return reply.code(400).send({ error: error.message });
    }
    const students = options.students.filter((student) => studentIds.includes(student.id));
    const examiners = options.examiners.filter((examiner) => examinerIds.includes(examiner.id));

    const stationIds = session.stations.map(s => s.id);

    // Delete existing assignments for clean slate
    await prisma.studentAssignment.deleteMany({ where: { stationId: { in: stationIds } } });
    await prisma.examinerAssignment.deleteMany({ where: { stationId: { in: stationIds } } });

    const examinerCount = session.config?.examinerCount ?? 3;

    for (let i = 0; i < session.stations.length; i++) {
      const station = session.stations[i];

      // Assign all students sequentially with candidate number (IndexNumber-C001)
      for (let j = 0; j < students.length; j++) {
        const student = students[j];
        const seqNum = `C${String(j + 1).padStart(3, '0')}`;
        const indexNum = student.staffId ? student.staffId.trim() : null;
        const candidateNumber = indexNum ? `${indexNum}-${seqNum}` : seqNum;
        await prisma.studentAssignment.create({
          data: { studentId: student.id, stationId: station.id, candidateNumber },
        });
      }

      // Assign examiners in a round-robin style, ensuring no duplicates on the same station
      if (examiners.length > 0) {
        const limit = Math.min(examinerCount, examiners.length);
        for (let j = 0; j < limit; j++) {
          const examinerIndex = (i * examinerCount + j) % examiners.length;
          const examiner = examiners[examinerIndex];
          await prisma.examinerAssignment.create({
            data: { examinerId: examiner.id, stationId: station.id },
          });
        }
      }
    }

    return {
      message: 'Selected candidates and examiners scheduled successfully',
      studentsCount: students.length,
      examinersCount: Math.min(examinerCount, examiners.length),
      stationsCount: session.stations.length,
      excludedStudents: options.excludedStudents,
    };
  });

  // Destructive but controlled: clear examination work while preserving the
  // session structure, station roster and examiner/student assignments.
  fastify.post('/:id/reset-examinations', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    const sessionId = request.params.id;
    const reason = String(request.body?.reason || '').trim();
    const confirmation = String(request.body?.confirmation || '').trim();
    const session = await prisma.examSession.findUnique({ where: { id: sessionId }, select: { id: true, name: true, status: true } });
    if (!session) return reply.code(404).send({ error: 'Session not found' });
    try { validateExaminationReset({ expectedSessionName: session.name, confirmation, reason }); }
    catch (error) { return reply.code(400).send({ error: error.message }); }

    const [taskAttempts, scorecards, results, carePlans, caseStudies, obstetric] = await Promise.all([
      prisma.taskAttempt.count({ where: { sessionId } }),
      prisma.scorecard.count({ where: { studentAssignment: { station: { sessionId } } } }),
      prisma.studentResult.count({ where: { sessionId } }),
      prisma.carePlanScore.count({ where: { sessionId } }),
      prisma.caseStudyEvaluation.count({ where: { sessionId } }),
      prisma.obstetricEvaluation.count({ where: { sessionId } }),
    ]);
    const snapshot = { previousStatus: session.status, taskAttempts, scorecards, results, carePlans, caseStudies, obstetric };

    await prisma.$transaction(async (tx) => {
      await tx.resultPublicationAudit.create({ data: { sessionId, action: 'EXAMINATION_DATA_RESET', reason, actorId: request.user.id, snapshot } });
      await tx.assessmentAudit.deleteMany({ where: { taskAttempt: { sessionId } } });
      await tx.scorecard.deleteMany({ where: { studentAssignment: { station: { sessionId } } } });
      await tx.taskAttempt.deleteMany({ where: { sessionId } });
      await tx.studentResult.deleteMany({ where: { sessionId } });
      await tx.carePlanScore.deleteMany({ where: { sessionId } });
      await tx.caseStudyEvaluation.deleteMany({ where: { sessionId } });
      await tx.obstetricEvaluation.deleteMany({ where: { sessionId } });
      await tx.studentAssignment.updateMany({ where: { station: { sessionId } }, data: { selectedTaskId: null, taskSelectedById: null, taskSelectedAt: null } });
      await tx.examSession.update({ where: { id: sessionId }, data: { status: 'ACTIVE' } });
    });

    return { message: 'Examination data cleared. Session is ready for fresh examinations.', deleted: snapshot };
  });

  // Session summary stats
  fastify.get('/:id/stats', { onRequest: [fastify.requireRole('ADMIN', 'EXAMINER')] }, async (request, reply) => {
    const sessionId = request.params.id;

    const [stations, studentCount, examinerCount, submittedCount, publishedResults, taskAttempts, results, carePlans, caseStudies, obstetric] = await Promise.all([
      prisma.station.findMany({ where: { sessionId }, select: { _count: { select: { studentAssignments: true, examinerAssignments: true } } } }),
      prisma.studentAssignment.count({ where: { station: { sessionId } } }),
      prisma.examinerAssignment.count({ where: { station: { sessionId } } }),
      prisma.scorecard.count({ where: { studentAssignment: { station: { sessionId } }, isSubmitted: true } }),
      prisma.studentResult.count({ where: { sessionId, status: 'PUBLISHED' } }),
      prisma.taskAttempt.count({ where: { sessionId } }),
      prisma.studentResult.count({ where: { sessionId } }),
      prisma.carePlanScore.count({ where: { sessionId } }),
      prisma.caseStudyEvaluation.count({ where: { sessionId } }),
      prisma.obstetricEvaluation.count({ where: { sessionId } }),
    ]);

    const stationCount = stations.length;
    const totalExpectedScorecards = stations.reduce(
      (total, station) => total + (station._count.studentAssignments * station._count.examinerAssignments),
      0,
    );

    return {
      stationCount,
      studentCount,
      examinerCount,
      submittedCount,
      totalExpectedScorecards,
      completionRate: totalExpectedScorecards > 0 
        ? Math.round((submittedCount / totalExpectedScorecards) * 100) 
        : 0,
      publishedResults,
      examinationRecords: { taskAttempts, scorecards: submittedCount, results, carePlans, caseStudies, obstetric },
    };
  });
}
