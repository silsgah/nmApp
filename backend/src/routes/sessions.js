/**
 * Exam Session Routes
 */
export default async function sessionRoutes(fastify) {
  const { prisma } = fastify;

  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request) => {
    const { programmeId, status, activeOnly } = request.query;
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
    };

    return prisma.examSession.findMany({
      where,
      include: {
        programme: { select: { id: true, name: true, fullName: true } },
        config: true,
        _count: { select: { stations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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

  // Auto-assign students and examiners
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

    // Filter students by matching programmeId AND yearLevel (if session has target yearLevel)
    const studentWhere = {
      role: 'STUDENT',
      programmeId: session.programmeId,
      isActive: true,
      ...(session.yearLevel && {
        OR: [
          { yearLevel: session.yearLevel },
          { yearLevel: null },
        ],
      }),
    };

    const [students, examiners] = await Promise.all([
      prisma.user.findMany({
        where: studentWhere,
        orderBy: { staffId: 'asc' },
      }),
      prisma.user.findMany({
        where: { role: 'EXAMINER', programmeId: session.programmeId, isActive: true },
      }),
    ]);

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

    return { message: 'Schedule generated successfully', studentsCount: students.length, stationsCount: session.stations.length };
  });

  // Session summary stats
  fastify.get('/:id/stats', { onRequest: [fastify.requireRole('ADMIN', 'EXAMINER')] }, async (request, reply) => {
    const sessionId = request.params.id;

    const [stations, studentCount, examinerCount, submittedCount, publishedResults] = await Promise.all([
      prisma.station.findMany({ where: { sessionId }, select: { _count: { select: { studentAssignments: true, examinerAssignments: true } } } }),
      prisma.studentAssignment.count({ where: { station: { sessionId } } }),
      prisma.examinerAssignment.count({ where: { station: { sessionId } } }),
      prisma.scorecard.count({ where: { studentAssignment: { station: { sessionId } }, isSubmitted: true } }),
      prisma.studentResult.count({ where: { sessionId, status: 'PUBLISHED' } }),
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
    };
  });
}
