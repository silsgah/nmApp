/**
 * Results Routes — Grading engine + results publication
 */
import { generateResultPdf, generateSessionBroadsheetPdf } from '../lib/pdf.js';

export default async function resultRoutes(fastify) {
  const { prisma } = fastify;

  // POST compute results for a session (admin triggers this)
  fastify.post('/compute/:sessionId', {
    onRequest: [fastify.requireRole('ADMIN')],
  }, async (request, reply) => {
    const { sessionId } = request.params;

    // Load session with config and programme
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { config: true },
    });
    if (!session) return reply.code(404).send({ error: 'Session not found' });

    const config = session.config || { examinerCount: 3, overallPassMark: 50, scoreAggregation: 'AVERAGE' };

    // Load assessment categories for this programme to get their weights
    const programmeCategories = await prisma.assessmentCategory.findMany({
      where: { programmeId: session.programmeId },
      orderBy: { sortOrder: 'asc' },
    });

    // Load care plan types for this programme
    const carePlanTypes = await prisma.carePlanType.findMany({
      where: { programmeId: session.programmeId },
      orderBy: { sortOrder: 'asc' },
    });

    // Build a weight lookup: categoryId → weight
    // Session-level categoryWeights override (from ExamConfig) takes precedence,
    // then falls back to the category's own weight field
    const configWeightOverrides = config.categoryWeights || {};
    const categoryWeightLookup = {};
    for (const cat of programmeCategories) {
      categoryWeightLookup[cat.id] = configWeightOverrides[cat.id] ?? cat.weight ?? 1.0;
    }

    // Validate that all assigned examiners have submitted their scorecards for all station candidates
    const stations = await prisma.station.findMany({
      where: { sessionId },
      include: {
        task: { select: { name: true } },
        examinerAssignments: { include: { examiner: { select: { name: true, email: true } } } },
        studentAssignments: { include: { student: { select: { name: true } }, selectedTask: { select: { name: true } } } },
      },
    });

    const pendingExaminations = [];

    for (const station of stations) {
      for (const sa of station.studentAssignments) {
        if (!sa.selectedTask && !station.task) {
          pendingExaminations.push({
            studentName: sa.student.name,
            stationCode: station.stationCode,
            taskName: 'Task not selected',
            examinerName: 'Unassigned',
            examinerEmail: null,
          });
          continue;
        }
        if (station.examinerAssignments.length === 0) {
          pendingExaminations.push({
            studentName: sa.student.name,
            stationCode: station.stationCode,
            taskName: sa.selectedTask?.name || station.task?.name,
            examinerName: 'No examiner assigned',
            examinerEmail: null,
          });
          continue;
        }
        // Load all submitted scorecards for this student assignment
        const scorecards = await prisma.scorecard.findMany({
          where: {
            studentAssignmentId: sa.id,
            isSubmitted: true,
          },
          select: { examinerId: true },
        });

        const submittedExaminerIds = new Set(scorecards.map(sc => sc.examinerId));

        for (const ea of station.examinerAssignments) {
          if (!submittedExaminerIds.has(ea.examinerId)) {
            pendingExaminations.push({
              studentName: sa.student.name,
              stationCode: station.stationCode,
              taskName: sa.selectedTask?.name || station.task?.name || 'Task not selected',
              examinerName: ea.examiner.name,
              examinerEmail: ea.examiner.email,
            });
          }
        }
      }
    }

    if (pendingExaminations.length > 0) {
      return reply.code(400).send({
        error: 'Cannot compute results. Some assigned examiners have not submitted their scorecards yet.',
        pending: pendingExaminations,
      });
    }

    // Load all student assignments in this session
    const studentAssignments = await prisma.studentAssignment.findMany({
      where: { station: { sessionId } },
      include: {
        selectedTask: { include: { category: true } },
        station: {
          include: {
            task: true,
            stationCategories: { include: { category: true } },
          },
        },
        scorecards: {
          where: { isSubmitted: true },
          include: { examiner: { select: { id: true, name: true } } },
        },
      },
    });

    // Group by student
    const studentMap = {};
    for (const sa of studentAssignments) {
      if (!studentMap[sa.studentId]) studentMap[sa.studentId] = [];
      studentMap[sa.studentId].push(sa);
    }

    const results = [];

    for (const [studentId, assignments] of Object.entries(studentMap)) {
      // For each task the student did, compute the scaled score using the category's scaledMaxMarks
      // Formula: scaled_score = (examiner_avg / task_max) × category.scaledMaxMarks
      //   Major task (scaledMaxMarks=80): (30/40) × 80 = 60
      //   Minor task (scaledMaxMarks=40): (30/40) × 40 = 30

      const categoryMap = {};

      for (const sa of assignments) {
        const categories = sa.selectedTask?.category
          ? [sa.selectedTask.category]
          : sa.station.stationCategories.map(sc => sc.category);
        const assessmentTask = sa.selectedTask || sa.station.task;
        if (!assessmentTask) continue;
        const taskMax = assessmentTask.maxScore;

        // Aggregate examiner scores for this task
        let taskScore = 0;
        if (sa.scorecards.length > 0) {
          if (config.scoreAggregation === 'AVERAGE') {
            taskScore = sa.scorecards.reduce((sum, s) => sum + s.totalScore, 0) / sa.scorecards.length;
          } else if (config.scoreAggregation === 'SUM') {
            taskScore = sa.scorecards.reduce((sum, s) => sum + s.totalScore, 0);
          } else if (config.scoreAggregation === 'HIGHEST') {
            taskScore = Math.max(...sa.scorecards.map(s => s.totalScore));
          }
        }

        // Map to each category this station belongs to
        for (const cat of categories) {
          if (!categoryMap[cat.id]) {
            categoryMap[cat.id] = {
              category: cat,
              totalScore: 0,
              maxScore: 0,
              scaledMaxMarks: cat.scaledMaxMarks ?? 80,
              tasks: 0,
            };
          }
          categoryMap[cat.id].totalScore += taskScore;
          categoryMap[cat.id].maxScore += taskMax;
          categoryMap[cat.id].tasks += 1;
        }

        // Fallback: no category assigned — use "General"
        if (categories.length === 0) {
          const key = 'UNCATEGORIZED';
          if (!categoryMap[key]) {
            categoryMap[key] = {
              category: { id: 'UNCATEGORIZED', name: 'Uncategorized', minPassScore: 50, scaledMaxMarks: 80 },
              totalScore: 0,
              maxScore: 0,
              scaledMaxMarks: 80,
              tasks: 0,
            };
          }
          categoryMap[key].totalScore += taskScore;
          categoryMap[key].maxScore += taskMax;
          categoryMap[key].tasks += 1;
        }
      }

      // Compute category scores — each category's score is scaled to its scaledMaxMarks
      const categoryScores = {};
      let practicalScore = 0;    // Sum of scaled scores across categories
      let practicalMaxScore = 0; // Sum of scaledMaxMarks across categories
      let allCategoryPassed = true;

      for (const [catId, catData] of Object.entries(categoryMap)) {
        // Category percentage (how well did the student do in raw terms)
        const percent = catData.maxScore > 0 ? (catData.totalScore / catData.maxScore) * 100 : 0;

        // Per-category pass check using the category's minPassScore
        const catMinPass = catData.category.minPassScore ?? config.overallPassMark;
        const catPassed = percent >= catMinPass;

        // Scale to this category's max marks
        // e.g. Major at 75% → (75/100) × 80 = 60 marks
        // e.g. Minor at 75% → (75/100) × 40 = 30 marks
        const scaledMaxMarks = catData.scaledMaxMarks;
        const scaledScore = (percent / 100) * scaledMaxMarks;

        practicalScore += scaledScore;
        practicalMaxScore += scaledMaxMarks;

        categoryScores[catId] = {
          categoryName: catData.category.name,
          score: catData.totalScore,
          maxScore: catData.maxScore,
          percentage: Math.round(percent * 100) / 100,
          scaledScore: Math.round(scaledScore * 100) / 100,
          scaledMaxMarks,
          passed: catPassed,
        };

        if (!catPassed) allCategoryPassed = false;
      }

      // Fetch care plan scores for this student (only factor in if care plan scores were entered)
      const studentCarePlanScores = await prisma.carePlanScore.findMany({
        where: { studentId, sessionId },
        include: { carePlanType: true },
      });

      if (studentCarePlanScores.length > 0) {
        let carePlanScore = 0;
        let carePlanMax = 0;
        for (const scoreObj of studentCarePlanScores) {
          const planType = scoreObj.carePlanType || carePlanTypes.find(t => t.id === scoreObj.carePlanTypeId);
          const maxForType = planType ? planType.maxMarks : 10;
          carePlanScore += scoreObj.marks;
          carePlanMax += maxForType;
        }

        if (carePlanMax > 0) {
          const carePlanPercent = (carePlanScore / carePlanMax) * 100;
          const carePlanPassed = carePlanPercent >= config.overallPassMark;

          categoryScores['CARE_PLAN'] = {
            categoryName: 'Care Plan',
            score: carePlanScore,
            maxScore: carePlanMax,
            percentage: Math.round(carePlanPercent * 100) / 100,
            scaledScore: Math.round(carePlanScore * 100) / 100,
            scaledMaxMarks: carePlanMax,
            passed: carePlanPassed,
          };

          practicalScore += carePlanScore;
          practicalMaxScore += carePlanMax;

          if (!carePlanPassed) allCategoryPassed = false;
        }
      }

      // Fetch Case Study evaluation for this student (only factor in if evaluation was submitted)
      const studentCaseStudyEval = await prisma.caseStudyEvaluation.findFirst({
        where: { studentId, sessionId, isSubmitted: true },
      });

      if (studentCaseStudyEval) {
        const csPercent = studentCaseStudyEval.percentage;
        const csPassed = csPercent >= config.overallPassMark;

        categoryScores['CASE_STUDY'] = {
          categoryName: 'Case Study',
          score: studentCaseStudyEval.totalScore,
          maxScore: studentCaseStudyEval.maxScore,
          percentage: studentCaseStudyEval.percentage,
          scaledScore: studentCaseStudyEval.totalScore,
          scaledMaxMarks: studentCaseStudyEval.maxScore,
          passed: csPassed,
        };

        practicalScore += studentCaseStudyEval.totalScore;
        practicalMaxScore += studentCaseStudyEval.maxScore;

        if (!csPassed) allCategoryPassed = false;
      }

      // Overall percentage for grading (scaled score as % of scaled max)
      const overallPercent = practicalMaxScore > 0 ? (practicalScore / practicalMaxScore) * 100 : 0;
      const overallPassed = overallPercent >= config.overallPassMark && allCategoryPassed;

      // Grade assignment (based on percentage)
      let grade = 'FAIL';
      if (overallPassed) {
        if (overallPercent >= 80) grade = 'A';
        else if (overallPercent >= 70) grade = 'B';
        else if (overallPercent >= 60) grade = 'C';
        else grade = 'D';
      }

      const result = await prisma.studentResult.upsert({
        where: { studentId_sessionId: { studentId, sessionId } },
        create: {
          studentId, sessionId, categoryScores,
          overallScore: Math.round(practicalScore * 100) / 100,
          overallMaxScore: practicalMaxScore,
          overallPercent: Math.round(overallPercent * 100) / 100,
          passed: overallPassed, grade,
        },
        update: {
          categoryScores,
          overallScore: Math.round(practicalScore * 100) / 100,
          overallMaxScore: practicalMaxScore,
          overallPercent: Math.round(overallPercent * 100) / 100,
          passed: overallPassed, grade,
          computedAt: new Date(),
        },
      });
      results.push(result);
    }

    return {
      message: `Computed results for ${results.length} students`,
      sessionId,
      count: results.length,
    };
  });

  // POST publish results
  fastify.post('/publish/:sessionId', {
    onRequest: [fastify.requireRole('ADMIN')],
  }, async (request, reply) => {
    await prisma.studentResult.updateMany({
      where: { sessionId: request.params.sessionId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    return { message: 'Results published' };
  });

  // GET results for a session (admin view)
  fastify.get('/session/:sessionId', {
    onRequest: [fastify.requireRole('ADMIN')],
  }, async (request) => {
    const { passed, search } = request.query;
    return prisma.studentResult.findMany({
      where: {
        sessionId: request.params.sessionId,
        ...(passed !== undefined && { passed: passed === 'true' }),
        ...(search && { student: { name: { contains: search, mode: 'insensitive' } } }),
      },
      include: {
        student: { select: { id: true, name: true, email: true, staffId: true } },
        session: { select: { name: true, semester: true, academicYear: true } },
      },
      orderBy: { overallPercent: 'desc' },
    });
  });

  // GET my result (student view)
  fastify.get('/my/:sessionId', {
    onRequest: [fastify.requireRole('STUDENT')],
  }, async (request, reply) => {
    const result = await prisma.studentResult.findUnique({
      where: {
        studentId_sessionId: { studentId: request.user.id, sessionId: request.params.sessionId },
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        session: {
          select: { name: true, semester: true, academicYear: true, programme: { select: { name: true, fullName: true } } },
        },
      },
    });
    if (!result) return reply.code(404).send({ error: 'Result not found' });
    if (result.status !== 'PUBLISHED') return reply.code(403).send({ error: 'Results not yet published' });
    return result;
  });

  // GET session summary stats
  fastify.get('/summary/:sessionId', {
    onRequest: [fastify.requireRole('ADMIN')],
  }, async (request) => {
    const results = await prisma.studentResult.findMany({
      where: { sessionId: request.params.sessionId },
    });

    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    const avgScore = total > 0 ? results.reduce((s, r) => s + r.overallPercent, 0) / total : 0;
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, FAIL: 0 };
    results.forEach(r => { if (r.grade) gradeDistribution[r.grade] = (gradeDistribution[r.grade] || 0) + 1; });

    return { total, passed, failed, passRate: total > 0 ? Math.round((passed / total) * 100) : 0, avgScore: Math.round(avgScore * 100) / 100, gradeDistribution };
  });

  // GET student's own sessions that have results
  fastify.get('/my-sessions', {
    onRequest: [fastify.authenticate],
  }, async (request) => {
    if (request.user.role === 'EXAMINER') return [];
    const studentId = request.user.role === 'STUDENT'
      ? request.user.id
      : request.query.studentId;

    const results = await prisma.studentResult.findMany({
      where: { studentId },
      include: { session: { select: { id: true, name: true, semester: true, academicYear: true, status: true } } },
      orderBy: { computedAt: 'desc' },
    });

    return results.map((r) => r.session).filter(Boolean);
  });

  // GET student result by studentId + sessionId (admin or student)
  fastify.get('/student/:studentId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { studentId } = request.params;
    const { sessionId } = request.query;

    if (!sessionId) return reply.code(400).send({ error: 'sessionId query param required' });
    if (request.user.role === 'STUDENT' && studentId !== request.user.id) return reply.code(403).send({ error: 'Forbidden' });
    if (request.user.role === 'EXAMINER') return reply.code(403).send({ error: 'Forbidden' });

    const result = await prisma.studentResult.findUnique({
      where: { studentId_sessionId: { studentId, sessionId } },
      include: {
        student: { select: { id: true, name: true, email: true } },
        session: {
          select: {
            id: true, name: true, semester: true, academicYear: true,
            config: { select: { overallPassMark: true } },
            programme: { select: { name: true, fullName: true } },
          },
        },
      },
    });

    if (!result) return reply.code(404).send({ error: 'Result not found' });

    if (request.user.role === 'EXAMINER') return reply.code(403).send({ error: 'Forbidden' });

    // Students can only see published results
    if (request.user.role === 'STUDENT' && result.status !== 'PUBLISHED') {
      return reply.code(403).send({ error: 'Results not yet published' });
    }

    return result;
  });

  // GET result details with full component task sheets (modal view)
  fastify.get('/:resultId/details', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { resultId } = request.params;

    const result = await prisma.studentResult.findUnique({
      where: { id: resultId },
      include: {
        student: { select: { id: true, name: true, email: true, staffId: true } },
        session: { select: { id: true, name: true, semester: true, academicYear: true, programme: { select: { name: true, fullName: true } } } },
      },
    });

    if (!result) return reply.code(404).send({ error: 'Result not found' });

    if (request.user.role === 'EXAMINER') return reply.code(403).send({ error: 'Forbidden' });

    // Guard: students can only view their own published results
    if (request.user.role === 'STUDENT') {
      if (result.studentId !== request.user.id) return reply.code(403).send({ error: 'Forbidden' });
      if (result.status !== 'PUBLISHED') return reply.code(403).send({ error: 'Result not yet published' });
    }

    // Load student assignments for the session stations
    const studentAssignments = await prisma.studentAssignment.findMany({
      where: {
        studentId: result.studentId,
        station: { sessionId: result.sessionId },
      },
      include: {
        selectedTask: {
          include: { steps: { orderBy: { stepNumber: 'asc' } } },
        },
        station: {
          include: {
            task: {
              include: {
                steps: { orderBy: { stepNumber: 'asc' } },
              },
            },
          },
        },
        scorecards: {
          where: { isSubmitted: true },
          include: {
            examiner: { select: { name: true, staffId: true } },
          },
        },
      },
      orderBy: { station: { stationCode: 'asc' } },
    });

    return {
      result,
      components: studentAssignments.map((sa) => {
        const task = sa.selectedTask || sa.station.task;
        return {
          stationCode: sa.station.stationCode,
          candidateNumber: sa.candidateNumber,
          task: task ? { name: task.name, description: task.description, ratingScale: task.ratingScale, maxScore: task.maxScore, steps: task.steps } : null,
          scorecards: sa.scorecards.map((sc) => ({
            examinerName: sc.examiner.name,
            examinerStaffId: sc.examiner.staffId,
            totalScore: sc.totalScore,
            maxPossibleScore: sc.maxPossibleScore,
            percentageScore: sc.percentageScore,
            remarks: sc.remarks,
            submittedAt: sc.submittedAt,
          })),
        };
      }),
    };
  });

  // GET PDF result slip for a specific result
  fastify.get('/:resultId/pdf', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const result = await prisma.studentResult.findUnique({
      where: { id: request.params.resultId },
      include: {
        student: { select: { id: true, name: true, email: true, staffId: true, profilePictureUrl: true, programme: { select: { name: true } } } },
        session: {
          select: {
            name: true, semester: true, academicYear: true,
            config: { select: { overallPassMark: true } },
            programme: { select: { name: true, fullName: true } },
          },
        },
      },
    });

    if (!result) return reply.code(404).send({ error: 'Result not found' });

    // Guard: students can only download their own published results
    if (request.user.role === 'EXAMINER') return reply.code(403).send({ error: 'Forbidden' });
    if (request.user.role === 'STUDENT') {
      if (result.studentId !== request.user.id) return reply.code(403).send({ error: 'Forbidden' });
      if (result.status !== 'PUBLISHED') return reply.code(403).send({ error: 'Result not yet published' });
    }

    try {
      const pdfBuffer = await generateResultPdf(result);
      const filename = `result_${result.student.name.replace(/\s+/g, '_')}_${result.session?.name?.replace(/\s+/g, '_') ?? 'slip'}.pdf`;

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', pdfBuffer.length);

      return reply.send(pdfBuffer);
    } catch (err) {
      fastify.log.error(err, 'PDF generation failed');
      return reply.code(500).send({ error: 'Failed to generate PDF' });
    }
  });

  // GET PDF Broadsheet report for a session
  fastify.get('/session/:sessionId/broadsheet/pdf', {
    onRequest: [fastify.requireRole('ADMIN')],
  }, async (request, reply) => {
    const { sessionId } = request.params;
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { programme: true },
    });
    if (!session) return reply.code(404).send({ error: 'Session not found' });

    const results = await prisma.studentResult.findMany({
      where: { sessionId },
      include: {
        student: { select: { name: true, email: true, staffId: true } },
      },
      orderBy: { student: { name: 'asc' } },
    });

    try {
      const pdfBuffer = await generateSessionBroadsheetPdf(session, results);
      const filename = `broadsheet_${session.name.replace(/\s+/g, '_')}.pdf`;

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', pdfBuffer.length);

      return reply.send(pdfBuffer);
    } catch (err) {
      fastify.log.error(err, 'Broadsheet PDF generation failed');
      return reply.code(500).send({ error: 'Failed to generate broadsheet PDF' });
    }
  });
}
