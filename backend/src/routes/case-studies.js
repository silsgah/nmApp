/**
 * Case Study Routes — Structured Rubric Evaluations (Midwifery, Obstetric, etc.)
 */

export const CASE_STUDY_RUBRICS = {
  MIDWIFERY_CASE_STUDY: {
    id: 'MIDWIFERY_CASE_STUDY',
    name: 'Midwifery & Nursing Case Study Evaluation',
    maxScore: 100,
    sections: [
      {
        key: 'DATA_GATHERING',
        name: 'DATA GATHERING',
        maxMarks: 20,
        subgroups: [
          {
            name: "PATIENT'S PARTICULARS",
            items: [
              { key: 'social', name: 'Social', maxMarks: 1, sortOrder: 1 },
              { key: 'medical', name: 'Medical', maxMarks: 2, sortOrder: 2 },
              { key: 'surgical', name: 'Surgical', maxMarks: 1, sortOrder: 3 },
            ],
          },
          {
            name: 'OBSTETRIC HISTORY',
            items: [
              { key: 'present_ob', name: 'Present', maxMarks: 3, sortOrder: 4 },
              { key: 'past_ob', name: 'Past', maxMarks: 7, sortOrder: 5 },
            ],
          },
          {
            name: 'FAMILY HISTORY',
            items: [
              { key: 'inherited_conditions', name: 'Inherited conditions', maxMarks: 2, sortOrder: 6 },
            ],
          },
          {
            name: 'HOME ENVIRONMENT',
            items: [
              { key: 'psychosocial', name: 'Psycho-social', maxMarks: 2, sortOrder: 7 },
              { key: 'physical', name: 'Physical', maxMarks: 2, sortOrder: 8 },
            ],
          },
        ],
      },
      {
        key: 'UTILIZATION_OF_DATA',
        name: 'UTILIZATION OF DATA IN MANAGEMENT OF THE CLIENT',
        maxMarks: 16,
        subgroups: [
          {
            name: 'MANAGEMENT',
            items: [
              { key: 'pregnancy_mgmt', name: 'Pregnancy', maxMarks: 4, sortOrder: 1 },
              { key: 'labour_mgmt', name: 'Labour', maxMarks: 4, sortOrder: 2 },
            ],
          },
          {
            name: 'PUERPERIUM',
            items: [
              { key: 'puerperium_mother', name: 'Mother', maxMarks: 4, sortOrder: 3 },
              { key: 'puerperium_baby', name: 'Baby', maxMarks: 4, sortOrder: 4 },
            ],
          },
        ],
      },
      {
        key: 'CARE_PLAN',
        name: 'CARE PLAN NB: (0.5 for each point, maximum 5 point)',
        maxMarks: 30,
        subgroups: [
          {
            name: 'PREGNANCY',
            items: [
              { key: 'cp_preg_prob', name: 'Identification of problems', maxMarks: 2, sortOrder: 1 },
              { key: 'cp_preg_obj', name: 'Setting objectives for patient care', maxMarks: 2, sortOrder: 2 },
              { key: 'cp_preg_orders', name: 'Nursing orders', maxMarks: 2, sortOrder: 3 },
              { key: 'cp_preg_interv', name: 'Nursing Intervention', maxMarks: 2, sortOrder: 4 },
              { key: 'cp_preg_eval', name: 'Evaluation', maxMarks: 2, sortOrder: 5 },
            ],
          },
          {
            name: 'LABOUR',
            items: [
              { key: 'cp_lab_prob', name: 'Identification of Problems', maxMarks: 2, sortOrder: 6 },
              { key: 'cp_lab_obj', name: 'Setting objectives for patient care', maxMarks: 2, sortOrder: 7 },
              { key: 'cp_lab_orders', name: 'Nursing orders', maxMarks: 2, sortOrder: 8 },
              { key: 'cp_lab_interv', name: 'Nursing Intervention', maxMarks: 2, sortOrder: 9 },
              { key: 'cp_lab_eval', name: 'Evaluation', maxMarks: 2, sortOrder: 10 },
            ],
          },
          {
            name: 'PUERPERIUM',
            items: [
              { key: 'cp_puerp_prob', name: 'Identification of Problems', maxMarks: 2, sortOrder: 11 },
              { key: 'cp_puerp_obj', name: 'Setting objectives for patient care', maxMarks: 2, sortOrder: 12 },
              { key: 'cp_puerp_orders', name: 'Nursing orders', maxMarks: 2, sortOrder: 13 },
              { key: 'cp_puerp_interv', name: 'Nursing Intervention', maxMarks: 2, sortOrder: 14 },
              { key: 'cp_puerp_eval', name: 'Evaluation', maxMarks: 2, sortOrder: 15 },
            ],
          },
        ],
      },
      {
        key: 'MIDWIFERY_CONCEPTS',
        name: 'APPLICATION OF MIDWIFERY CONCEPTS IN FAMILY CENTERED MATERNITY CARE STUDY',
        maxMarks: 11,
        subgroups: [
          {
            name: 'CONCEPTS',
            items: [
              { key: 'family_involvement', name: 'Family involvement', maxMarks: 3, sortOrder: 1 },
              { key: 'continuity_care', name: 'Continuity of care including referrals', maxMarks: 4, sortOrder: 2 },
              { key: 'emotional_support', name: 'Emotional support (problems)', maxMarks: 4, sortOrder: 3 },
            ],
          },
        ],
      },
      {
        key: 'PRESENTATION_OF_PAPER',
        name: 'PRESENTATION OF PAPER',
        maxMarks: 13,
        subgroups: [
          {
            name: 'PRESENTATION',
            items: [
              { key: 'organisation', name: 'Organisation', maxMarks: 3, sortOrder: 1 },
              { key: 'relevance', name: 'Relevance', maxMarks: 2, sortOrder: 2 },
              { key: 'conclusion', name: 'Conclusion', maxMarks: 4, sortOrder: 3 },
              { key: 'bibliography', name: 'Bibliography', maxMarks: 4, sortOrder: 4 },
            ],
          },
        ],
      },
      {
        key: 'VIVA_VOCE',
        name: 'VIVA VOCE',
        maxMarks: 10,
        subgroups: [
          {
            name: 'ORAL DEFENSE',
            items: [
              { key: 'viva_voce', name: 'VIVA VOCE', maxMarks: 10, sortOrder: 1 },
            ],
          },
        ],
      },
    ],
  },
  OBSTETRIC_CASE_STUDY: {
    id: 'OBSTETRIC_CASE_STUDY',
    name: 'Obstetric & Gynecological Case Study Evaluation',
    maxScore: 100,
    sections: [
      {
        key: 'CLINICAL_HISTORY',
        name: 'CLINICAL HISTORY & ASSESSMENT',
        maxMarks: 25,
        subgroups: [
          {
            name: 'PATIENT HISTORY',
            items: [
              { key: 'demographics', name: 'Demographics & Chief Complaint', maxMarks: 5, sortOrder: 1 },
              { key: 'obstetric_gyne_history', name: 'Obstetric & Gynaecological History', maxMarks: 10, sortOrder: 2 },
              { key: 'medical_surgical_history', name: 'Past Medical & Surgical History', maxMarks: 5, sortOrder: 3 },
              { key: 'social_family_history', name: 'Social & Family History', maxMarks: 5, sortOrder: 4 },
            ],
          },
        ],
      },
      {
        key: 'EXAMINATION_DIAGNOSIS',
        name: 'PHYSICAL EXAMINATION & DIFFERENTIAL DIAGNOSIS',
        maxMarks: 25,
        subgroups: [
          {
            name: 'EXAMINATION',
            items: [
              { key: 'physical_exam', name: 'General & Abdominal Physical Exam', maxMarks: 10, sortOrder: 1 },
              { key: 'investigations', name: 'Laboratory & Diagnostic Investigations', maxMarks: 8, sortOrder: 2 },
              { key: 'differential_diagnosis', name: 'Differential Diagnosis & Clinical Reasoning', maxMarks: 7, sortOrder: 3 },
            ],
          },
        ],
      },
      {
        key: 'MANAGEMENT_PLAN',
        name: 'OBSTETRIC MANAGEMENT & CARE PLAN',
        maxMarks: 25,
        subgroups: [
          {
            name: 'MANAGEMENT',
            items: [
              { key: 'antenatal_intrapartum', name: 'Antenatal / Intrapartum / Postpartum Management', maxMarks: 10, sortOrder: 1 },
              { key: 'pharmacology_treatment', name: 'Pharmacology & Interventions', maxMarks: 8, sortOrder: 2 },
              { key: 'complication_handling', name: 'Complication Prevention & Emergency Preparedness', maxMarks: 7, sortOrder: 3 },
            ],
          },
        ],
      },
      {
        key: 'PRESENTATION_VIVA',
        name: 'PRESENTATION & VIVA VOCE',
        maxMarks: 25,
        subgroups: [
          {
            name: 'PRESENTATION & VIVA',
            items: [
              { key: 'paper_structure', name: 'Case Report Documentation & Structure', maxMarks: 10, sortOrder: 1 },
              { key: 'viva_defense', name: 'Oral Viva Voce & Clinical Defense', maxMarks: 15, sortOrder: 2 },
            ],
          },
        ],
      },
    ],
  },
};

import { requireAssessmentAccess, requireOpenSession } from '../lib/assessment-access.js';

export default async function caseStudyRoutes(fastify) {
  const { prisma } = fastify;

  // Get available Case Study Rubrics
  fastify.get('/rubric', { onRequest: [fastify.authenticate] }, async (request) => {
    const { type } = request.query;
    if (type && CASE_STUDY_RUBRICS[type]) {
      return CASE_STUDY_RUBRICS[type];
    }
    return CASE_STUDY_RUBRICS;
  });

  // Get Case Study evaluation for a student in a session
  fastify.get('/evaluations/:sessionId/student/:studentId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { sessionId, studentId } = request.params;
    if (!await requireAssessmentAccess(prisma, request, reply, { sessionId, studentId, allowStudent: true })) return;
    const { type = 'MIDWIFERY_CASE_STUDY' } = request.query;

    const evaluation = await prisma.caseStudyEvaluation.findUnique({
      where: {
        studentId_sessionId_type: { studentId, sessionId, type },
      },
      include: {
        itemScores: {
          orderBy: { sortOrder: 'asc' },
        },
        examiner: {
          select: { id: true, name: true, staffId: true },
        },
        student: {
          select: { id: true, name: true, email: true, staffId: true },
        },
      },
    });

    if (!evaluation) {
      return reply.code(404).send({ error: 'Case Study evaluation not found' });
    }

    return evaluation;
  });

  // Save/Update Case Study Evaluation (Batch save item scores & comments)
  fastify.post('/evaluations', { onRequest: [fastify.requireRole('ADMIN', 'EXAMINER')] }, async (request, reply) => {
    const { studentId, sessionId, type = 'MIDWIFERY_CASE_STUDY', itemScores, isSubmitted = true } = request.body;
    const examinerId = request.user.id;

    if (!studentId || !sessionId || !Array.isArray(itemScores)) {
      return reply.code(400).send({ error: 'studentId, sessionId, and itemScores array are required' });
    }
    if (!await requireAssessmentAccess(prisma, request, reply, { sessionId, studentId })) return;
    if (!await requireOpenSession(prisma, reply, sessionId)) return;

    const rubric = CASE_STUDY_RUBRICS[type] || CASE_STUDY_RUBRICS['MIDWIFERY_CASE_STUDY'];

    // Calculate total score and validate item marks
    let totalScore = 0;
    const validatedItems = [];

    for (const item of itemScores) {
      const { sectionKey, itemKey, itemName, marks, comment, sortOrder } = item;
      if (!sectionKey || !itemKey) {
        return reply.code(400).send({ error: 'Each item must specify sectionKey and itemKey' });
      }

      const numMarks = parseFloat(marks) || 0;
      const rubricItem = rubric.sections
        .flatMap((section) => section.subgroups.flatMap((group) => group.items.map((entry) => ({ ...entry, sectionKey: section.key }))))
        .find((entry) => entry.key === itemKey);
      if (!rubricItem || rubricItem.sectionKey !== sectionKey) {
        return reply.code(400).send({ error: `Invalid rubric item: ${itemKey}` });
      }
      const numMax = Number(rubricItem.maxMarks);

      if (numMarks < 0 || numMarks > numMax) {
        return reply.code(400).send({ error: `Marks for ${itemName || itemKey} must be between 0 and ${numMax}` });
      }

      totalScore += numMarks;

      validatedItems.push({
        sectionKey,
        itemKey,
        itemName: itemName || itemKey,
        marks: numMarks,
        maxMarks: numMax,
        comment: comment ? String(comment).trim() : null,
        sortOrder: sortOrder || 0,
      });
    }

    totalScore = Math.round(totalScore * 100) / 100;
    const percentage = Math.round((totalScore / rubric.maxScore) * 100 * 100) / 100;

    // Use transaction to update evaluation and replace itemScores
    const result = await prisma.$transaction(async (tx) => {
      const evaluation = await tx.caseStudyEvaluation.upsert({
        where: {
          studentId_sessionId_type: { studentId, sessionId, type },
        },
        create: {
          studentId,
          sessionId,
          examinerId,
          type,
          totalScore,
          maxScore: rubric.maxScore,
          percentage,
          isSubmitted,
          submittedAt: isSubmitted ? new Date() : null,
        },
        update: {
          examinerId,
          totalScore,
          maxScore: rubric.maxScore,
          percentage,
          isSubmitted,
          submittedAt: isSubmitted ? new Date() : undefined,
        },
      });

      // Delete existing item scores and recreate
      await tx.caseStudyItemScore.deleteMany({
        where: { evaluationId: evaluation.id },
      });

      await tx.caseStudyItemScore.createMany({
        data: validatedItems.map((item) => ({
          ...item,
          evaluationId: evaluation.id,
        })),
      });

      return tx.caseStudyEvaluation.findUnique({
        where: { id: evaluation.id },
        include: {
          itemScores: { orderBy: { sortOrder: 'asc' } },
          student: { select: { id: true, name: true, staffId: true } },
          examiner: { select: { id: true, name: true } },
        },
      });
    });

    return reply.code(200).send(result);
  });

  // Admin list all Case Study evaluations for a session
  fastify.get('/evaluations/:sessionId', { onRequest: [fastify.requireRole('ADMIN')] }, async (request) => {
    const { sessionId } = request.params;
    const { type } = request.query;

    const whereClause = { sessionId };
    if (type) whereClause.type = type;

    return prisma.caseStudyEvaluation.findMany({
      where: whereClause,
      include: {
        student: { select: { id: true, name: true, email: true, staffId: true } },
        examiner: { select: { id: true, name: true, staffId: true } },
        itemScores: true,
      },
      orderBy: { student: { name: 'asc' } },
    });
  });

  // Admin delete evaluation
  fastify.delete('/evaluations/:id', { onRequest: [fastify.requireRole('ADMIN')] }, async (request, reply) => {
    try {
      await prisma.caseStudyEvaluation.delete({
        where: { id: request.params.id },
      });
      return { message: 'Case Study evaluation deleted' };
    } catch {
      return reply.code(404).send({ error: 'Case Study evaluation not found' });
    }
  });
}
