import 'dotenv/config';
import prisma from '../db/prisma.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🌱 Seeding database — Year Levels + Multi-Programme Tasks...');

  // Clean existing data (reverse dependency order)
  await prisma.studentResult.deleteMany();
  await prisma.carePlanScore.deleteMany();
  await prisma.carePlanType.deleteMany();
  await prisma.scorecard.deleteMany();
  await prisma.examinerAssignment.deleteMany();
  await prisma.studentAssignment.deleteMany();
  await prisma.stationCategory.deleteMany();
  await prisma.station.deleteMany();
  await prisma.examConfig.deleteMany();
  await prisma.examSession.deleteMany();
  await prisma.taskStep.deleteMany();
  await prisma.taskYearLevel.deleteMany();
  await prisma.taskProgramme.deleteMany();
  await prisma.task.deleteMany();
  await prisma.assessmentCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.programme.deleteMany();

  // ──────────────────────────────────────────
  // 1. CREATE PROGRAMMES
  // ──────────────────────────────────────────
  const rgn = await prisma.programme.create({
    data: { name: 'RGN', fullName: 'Registered General Nurse', description: 'General nursing programme' },
  });
  const rm = await prisma.programme.create({
    data: { name: 'RM', fullName: 'Registered Midwife', description: 'Midwifery programme' },
  });
  console.log('✅ Programmes created');

  // ──────────────────────────────────────────
  // 2. CREATE CARE PLAN TYPES
  // ──────────────────────────────────────────
  await prisma.carePlanType.create({ data: { name: 'RGN (Surgery)', programmeId: rgn.id, maxMarks: 10.0, sortOrder: 1 } });
  await prisma.carePlanType.create({ data: { name: 'RGN (Medicine)', programmeId: rgn.id, maxMarks: 10.0, sortOrder: 2 } });
  await prisma.carePlanType.create({ data: { name: 'RM (Antenatal)', programmeId: rm.id, maxMarks: 10.0, sortOrder: 1 } });
  await prisma.carePlanType.create({ data: { name: 'RM (Postnatal)', programmeId: rm.id, maxMarks: 10.0, sortOrder: 2 } });
  console.log('✅ Care Plan Types created');

  // ──────────────────────────────────────────
  // 3. CREATE ASSESSMENT CATEGORIES (renamed per IT head)
  // ──────────────────────────────────────────
  // RGN categories: "Basic Procedures" + "Advanced Procedures" + "Health Assessment"
  const rgnBasic = await prisma.assessmentCategory.create({
    data: { name: 'Basic Procedures', description: 'Foundational nursing skills and procedures', programmeId: rgn.id, weight: 0.4, scaledMaxMarks: 40, minPassScore: 50, sortOrder: 1 },
  });
  const rgnAdvanced = await prisma.assessmentCategory.create({
    data: { name: 'Advanced Procedures', description: 'Complex clinical procedures requiring higher competency', programmeId: rgn.id, weight: 0.6, scaledMaxMarks: 80, minPassScore: 50, sortOrder: 2 },
  });
  const healthAssessment = await prisma.assessmentCategory.create({
    data: { name: 'Health Assessment', description: 'Clinical assessment and history-taking tasks', programmeId: rgn.id, weight: 1.0, scaledMaxMarks: 80, minPassScore: 50, sortOrder: 3 },
  });

  // RM categories: "Basic Nursing" + "Midwifery"
  const rmBasicNursing = await prisma.assessmentCategory.create({
    data: { name: 'Basic Nursing', description: 'General nursing skills required for midwifery students', programmeId: rm.id, weight: 0.4, scaledMaxMarks: 40, minPassScore: 50, sortOrder: 1 },
  });
  const rmMidwifery = await prisma.assessmentCategory.create({
    data: { name: 'Midwifery', description: 'Midwifery-specific clinical tasks', programmeId: rm.id, weight: 0.6, scaledMaxMarks: 80, minPassScore: 50, sortOrder: 2 },
  });
  console.log('✅ Categories created (renamed: Basic Procedures, Advanced Procedures, Basic Nursing, Midwifery)');

  // ──────────────────────────────────────────
  // 4. LOAD EXTRACTED TASKS (from PDF scraping)
  // ──────────────────────────────────────────
  const rawTasks = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted_tasks.json'), 'utf8'));

  // ── HELPER: classify RGN tasks per IT head's "Basic Procedures" vs "Advanced Procedures"
  const IT_HEAD_BASIC_RGN = [
    'making a simple unoccupied bed', 'making an admission bed', 'making an operation bed',
    'making a cardiac bed', 'changing bottom sheet', 'orientation of patient',
    'recording of intake and output', 'mouth care for a seriously ill patient',
    'handing over the ward', 'taking over the ward', 'educating a patient on condition',
    'educating a patient on medication', 'feeding a helpless patient',
    'spoon feeding of an adult ill patient',
    'processing instruments after use', 'decontamination',
    'admission of a patient', 'admission of a child', 'discharging a patient',
    'bed bathing', 'tepid sponging', 'feeding a patient per naso',
  ];

  const isRgnBasic = (title) => {
    const t = title.toLowerCase();
    return IT_HEAD_BASIC_RGN.some(keyword => t.includes(keyword));
  };

  // ── HELPER: classify RM midwifery tasks
  const isRmMidwifery = (title) => {
    const t = title.toLowerCase();
    return (
      t.includes('pregnant') || t.includes('obstet') || t.includes('newborn') ||
      t.includes('midwifery') || t.includes('labor') || t.includes('labour') ||
      t.includes('breast') || t.includes('puerperal') || t.includes('cord dressing') ||
      t.includes('vulva') || t.includes('antenatal') || t.includes('ante-natal') ||
      t.includes('fix and breastfeed') || t.includes('health education on')
    );
  };

  // ── RGN tasks that should also be shared with RM (basic nursing tasks RM students also do)
  const SHARED_WITH_RM_KEYWORDS = [
    'making a simple unoccupied bed', 'making an admission bed', 'making an operation bed',
    'making a cardiac bed', 'changing bottom sheet', 'vital signs',
    'admission of a patient', 'orientation of patient',
    'oral medication', 'administration of tablet', 'administration of mixture',
    'im injection', 'intramuscular', 'iv medication', 'ampoule',
    'preparing trolley for intravenous', 'preparaing trolley for intravenous', 'setting up i.v.',
    'blood transfusion', 'recording of intake',
    'bed bathing', 'pressure areas', 'mouth care',
    'handing over the ward', 'taking over the ward',
    'educating a patient on condition', 'educating a patient on medication',
    'spoon feeding', 'dressing of wound', 'removal of stitches',
    'processing instruments', 'decontamination',
    'pre-operative', 'post-operative',
    'catheterization', 'catheter care', 'removal of an indwelling catheter',
  ];

  const shouldShareWithRM = (title) => {
    const t = title.toLowerCase();
    return SHARED_WITH_RM_KEYWORDS.some(keyword => t.includes(keyword));
  };

  // ── YEAR LEVEL HELPERS (per IT Head's PDFs)
  // RGN: all tasks are available for Year 2 & 3 (single combined list)
  // RM: Basic Nursing tasks are Year 2 & 3; Midwifery tasks differ by year
  const RM3_ONLY_MIDWIFERY_KEYWORDS = [
    'first stage of labor', 'second stage of labor', 'third stage of labor',
    'bathing a newborn baby', 'bathing the newborn', 'cord dressing',
    'examining a newborn baby in a l', // "in a labor ward"
    'fixing a baby to breast', 'fix and breastfeed',
    'examination of the puerperal',
    'vulva swabbing', 'vulva toileting of a puerperal',
    'setting of instruments and trays for labor', 'setting instruments',
  ];

  const isRM3Only = (title) => {
    const t = title.toLowerCase();
    return RM3_ONLY_MIDWIFERY_KEYWORDS.some(keyword => t.includes(keyword));
  };

  // ──────────────────────────────────────────
  // 5. SEED RGN TASKS (with cross-programme sharing)
  // ──────────────────────────────────────────
  console.log(`Seeding ${rawTasks.RGN.length} RGN tasks...`);
  for (const t of rawTasks.RGN) {
    const categoryId = isRgnBasic(t.name) ? rgnBasic.id : rgnAdvanced.id;
    const shareWithRM = shouldShareWithRM(t.name);

    const programmeConnections = [{ programmeId: rgn.id }];
    if (shareWithRM) {
      programmeConnections.push({ programmeId: rm.id });
    }

    await prisma.task.create({
      data: {
        name: t.name,
        ratingScale: 'SCALE_0_4',
        maxScore: t.steps.length * 4,
        categoryId,
        programmes: { create: programmeConnections },
        yearLevels: { create: [{ yearLevel: 2 }, { yearLevel: 3 }] },
        steps: {
          create: t.steps.map((s) => ({
            stepNumber: s.stepNumber,
            description: s.description,
          })),
        },
      },
    });
  }

  // ──────────────────────────────────────────
  // 6. SEED HEALTH ASSESSMENT TASKS (RGN only)
  // ──────────────────────────────────────────
  console.log(`Seeding ${rawTasks.HA.length} Health Assessment tasks...`);
  for (const t of rawTasks.HA) {
    const cleanName = t.name.replace(/^TASK:\s*/i, '').trim();
    await prisma.task.create({
      data: {
        name: cleanName,
        ratingScale: 'SCALE_0_2',
        maxScore: t.steps.length * 2,
        categoryId: healthAssessment.id,
        programmes: { create: [{ programmeId: rgn.id }] },
        yearLevels: { create: [{ yearLevel: 2 }, { yearLevel: 3 }] },
        steps: {
          create: t.steps.map((s) => ({
            stepNumber: s.stepNumber,
            description: s.description,
          })),
        },
      },
    });
  }

  // ──────────────────────────────────────────
  // 7. SEED RM MIDWIFERY TASKS (RM only, with year-level tagging)
  // ──────────────────────────────────────────
  console.log(`Seeding ${rawTasks.RM.length} RM midwifery tasks...`);
  for (const t of rawTasks.RM) {
    // Determine year levels — most midwifery tasks are Year 2 & 3,
    // but some advanced ones (labor stages, etc.) are Year 3 only
    const rm3Only = isRM3Only(t.name);
    const yearLevelData = rm3Only
      ? [{ yearLevel: 3 }]
      : [{ yearLevel: 2 }, { yearLevel: 3 }];

    await prisma.task.create({
      data: {
        name: t.name,
        ratingScale: 'SCALE_0_4',
        maxScore: t.steps.length * 4,
        categoryId: rmMidwifery.id,
        programmes: { create: [{ programmeId: rm.id }] },
        yearLevels: { create: yearLevelData },
        steps: {
          create: t.steps.map((s) => ({
            stepNumber: s.stepNumber,
            description: s.description,
          })),
        },
      },
    });
  }

  console.log('✅ Task bank populated (with multi-programme sharing and year levels)');

  // ──────────────────────────────────────────
  // 8. SEED USERS
  // ──────────────────────────────────────────
  const hash = (pw) => bcrypt.hash(pw, 12);

  const admin = await prisma.user.create({
    data: { name: 'Administrator', email: 'admin@nmportal.edu.gh', passwordHash: await hash('Admin123!'), role: 'ADMIN' },
  });

  const examiner1 = await prisma.user.create({
    data: { name: 'Matron Agnes Owusu', email: 'agnes.owusu@nmportal.edu.gh', passwordHash: await hash('Exam123!'), role: 'EXAMINER', staffId: 'SNO-001', programmeId: rgn.id },
  });
  const examiner2 = await prisma.user.create({
    data: { name: 'Sr. Felicia Agyemang', email: 'felicia.agyemang@nmportal.edu.gh', passwordHash: await hash('Exam123!'), role: 'EXAMINER', staffId: 'SNO-002', programmeId: rgn.id },
  });
  const examiner3 = await prisma.user.create({
    data: { name: 'Mr. Kofi Mensah', email: 'kofi.mensah@nmportal.edu.gh', passwordHash: await hash('Exam123!'), role: 'EXAMINER', staffId: 'NO-003', programmeId: rm.id },
  });
  const examiner4 = await prisma.user.create({
    data: { name: 'Matron Comfort Osei', email: 'comfort.osei@nmportal.edu.gh', passwordHash: await hash('Exam123!'), role: 'EXAMINER', staffId: 'SNO-004', programmeId: rm.id },
  });

  const student1 = await prisma.user.create({
    data: { name: 'Abena Asante', email: 'abena.asante@student.nmportal.edu.gh', passwordHash: await hash('Student123!'), role: 'STUDENT', programmeId: rgn.id },
  });
  const student2 = await prisma.user.create({
    data: { name: 'Kwame Boateng', email: 'kwame.boateng@student.nmportal.edu.gh', passwordHash: await hash('Student123!'), role: 'STUDENT', programmeId: rgn.id },
  });
  const student3 = await prisma.user.create({
    data: { name: 'Yaa Mansa', email: 'yaa.mansa@student.nmportal.edu.gh', passwordHash: await hash('Student123!'), role: 'STUDENT', programmeId: rm.id },
  });

  console.log('✅ Users seeded');

  // ──────────────────────────────────────────
  // 9. SEED EXAM SESSIONS (with year level)
  // ──────────────────────────────────────────
  const rgnSession = await prisma.examSession.create({
    data: {
      name: '2026 RGN Year 3 Practical Examination',
      semester: 'Semester 1',
      academicYear: '2025/2026',
      programmeId: rgn.id,
      yearLevel: 3,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const rmSession = await prisma.examSession.create({
    data: {
      name: '2026 RM Year 2 Practical Examination',
      semester: 'Semester 1',
      academicYear: '2025/2026',
      programmeId: rm.id,
      yearLevel: 2,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.examConfig.create({
    data: { sessionId: rgnSession.id, examinerCount: 3, overallPassMark: 50.0, practicalMaxMarks: 80.0, scoreAggregation: 'AVERAGE' },
  });
  await prisma.examConfig.create({
    data: { sessionId: rmSession.id, examinerCount: 3, overallPassMark: 50.0, practicalMaxMarks: 80.0, scoreAggregation: 'AVERAGE' },
  });

  console.log('✅ Exam sessions & configurations created (with year levels)');

  // ──────────────────────────────────────────
  // 10. CREATE STATIONS
  // ──────────────────────────────────────────
  // Find tasks for stations
  const taskVitalSigns = await prisma.task.findFirst({ where: { name: { contains: 'VITAL SIGNS – TEMPERATURE' } } });
  const taskWoundDressing = await prisma.task.findFirst({ where: { name: { contains: 'DRESSING OF WOUND (SIMPLE' } } });
  const taskFeeding = await prisma.task.findFirst({ where: { name: { contains: 'FEEDING A PATIENT PER NASO-GASTRIC' } } });
  const taskReviewSystem = await prisma.task.findFirst({ where: { name: { contains: 'REVIEW OF PATIENT\'S SYSTEM' } } });

  const taskAncExam = await prisma.task.findFirst({ where: { name: { contains: 'GENERAL EXAMINATION OF THE PREGNANT CLIENT' } } });
  const taskBreastExam = await prisma.task.findFirst({ where: { name: { contains: 'EXAMINING THE BREAST OF THE PREGNANT CLIENT' } } });
  const taskBirthPrep = await prisma.task.findFirst({ where: { name: { contains: 'GIVING HEALTH EDUCATION ON BIRTH PREPAREDNESS' } } });

  const stationR1 = await prisma.station.create({
    data: { sessionId: rgnSession.id, taskId: taskVitalSigns.id, stationCode: 'A1', notes: 'Vital Signs Station' },
  });
  await prisma.stationCategory.create({ data: { stationId: stationR1.id, categoryId: rgnAdvanced.id } });

  const stationR2 = await prisma.station.create({
    data: { sessionId: rgnSession.id, taskId: taskWoundDressing.id, stationCode: 'A2', notes: 'Wound Care Station' },
  });
  await prisma.stationCategory.create({ data: { stationId: stationR2.id, categoryId: rgnBasic.id } });

  const stationR3 = await prisma.station.create({
    data: { sessionId: rgnSession.id, taskId: taskFeeding.id, stationCode: 'A3', notes: 'Nutrition Feeding Station' },
  });
  await prisma.stationCategory.create({ data: { stationId: stationR3.id, categoryId: rgnAdvanced.id } });

  const stationR4 = await prisma.station.create({
    data: { sessionId: rgnSession.id, taskId: taskReviewSystem.id, stationCode: 'A4', notes: 'Physical Assessment Station' },
  });
  await prisma.stationCategory.create({ data: { stationId: stationR4.id, categoryId: healthAssessment.id } });

  const stationM1 = await prisma.station.create({
    data: { sessionId: rmSession.id, taskId: taskAncExam.id, stationCode: 'B1', notes: 'Ante-natal Clinic Station' },
  });
  await prisma.stationCategory.create({ data: { stationId: stationM1.id, categoryId: rmMidwifery.id } });

  const stationM2 = await prisma.station.create({
    data: { sessionId: rmSession.id, taskId: taskBreastExam.id, stationCode: 'B2', notes: 'Breast Palpation Station' },
  });
  await prisma.stationCategory.create({ data: { stationId: stationM2.id, categoryId: rmMidwifery.id } });

  const stationM3 = await prisma.station.create({
    data: { sessionId: rmSession.id, taskId: taskBirthPrep.id, stationCode: 'B3', notes: 'Patient Education Station' },
  });
  await prisma.stationCategory.create({ data: { stationId: stationM3.id, categoryId: rmMidwifery.id } });

  console.log('✅ Exam stations initialized');

  // ──────────────────────────────────────────
  // 11. ASSIGNMENTS
  // ──────────────────────────────────────────
  const rgnStations = [stationR1, stationR2, stationR3, stationR4];
  const rmStations = [stationM1, stationM2, stationM3];

  for (const st of rgnStations) {
    await prisma.studentAssignment.create({ data: { studentId: student1.id, stationId: st.id, candidateNumber: 'CAN-RGN-2026-001' } });
    await prisma.studentAssignment.create({ data: { studentId: student2.id, stationId: st.id, candidateNumber: 'CAN-RGN-2026-002' } });
  }
  for (const st of rmStations) {
    await prisma.studentAssignment.create({ data: { studentId: student3.id, stationId: st.id, candidateNumber: 'CAN-RM-2026-003' } });
  }

  await prisma.examinerAssignment.create({ data: { examinerId: examiner1.id, stationId: stationR1.id } });
  await prisma.examinerAssignment.create({ data: { examinerId: examiner1.id, stationId: stationR2.id } });
  await prisma.examinerAssignment.create({ data: { examinerId: examiner2.id, stationId: stationR3.id } });
  await prisma.examinerAssignment.create({ data: { examinerId: examiner2.id, stationId: stationR4.id } });
  await prisma.examinerAssignment.create({ data: { examinerId: examiner3.id, stationId: stationM1.id } });
  await prisma.examinerAssignment.create({ data: { examinerId: examiner3.id, stationId: stationM2.id } });
  await prisma.examinerAssignment.create({ data: { examinerId: examiner4.id, stationId: stationM1.id } });
  await prisma.examinerAssignment.create({ data: { examinerId: examiner4.id, stationId: stationM2.id } });
  await prisma.examinerAssignment.create({ data: { examinerId: examiner4.id, stationId: stationM3.id } });

  console.log('✅ Student and Examiner assignments established');

  // Summary stats
  const totalTasks = await prisma.task.count();
  const sharedTasks = await prisma.task.count({
    where: { programmes: { some: { programmeId: rm.id } }, AND: { programmes: { some: { programmeId: rgn.id } } } },
  });
  const rmOnlyTasks = await prisma.task.count({
    where: { programmes: { every: { programmeId: rm.id } } },
  });

  console.log(`
  ─────────────────────────────────────────────
  🏥 GAFCONM Exam Portal — Seed Complete!
  ─────────────────────────────────────────────
  📊 Tasks: ${totalTasks} total, ${sharedTasks} shared (RGN+RM), ${rmOnlyTasks} RM-only
  📋 Categories: Basic Procedures, Advanced Procedures (RGN) | Basic Nursing, Midwifery (RM)
  📅 Year Levels: Tasks tagged with Year 2 and/or Year 3

  Admin:      admin@nmportal.edu.gh           / Admin123!
  Examiner 1: agnes.owusu@nmportal.edu.gh     / Exam123!  (RGN Stations A1, A2)
  Examiner 2: felicia.agyemang@nmportal.edu.gh / Exam123!  (RGN Stations A3, A4)
  Examiner 3: kofi.mensah@nmportal.edu.gh     / Exam123!  (RM Stations B1, B2)
  Examiner 4: comfort.osei@nmportal.edu.gh    / Exam123!  (RM Stations B1, B2, B3)
  Student 1:  abena.asante@student.nmportal.edu.gh   / Student123! (RGN)
  Student 2:  kwame.boateng@student.nmportal.edu.gh / Student123! (RGN)
  Student 3:  yaa.mansa@student.nmportal.edu.gh       / Student123! (RM)
  ─────────────────────────────────────────────
  `);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
