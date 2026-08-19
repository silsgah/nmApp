ALTER TABLE "stations" ALTER COLUMN "taskId" DROP NOT NULL;
ALTER TABLE "student_assignments"
  ADD COLUMN "selectedTaskId" TEXT,
  ADD COLUMN "taskSelectedById" TEXT,
  ADD COLUMN "taskSelectedAt" TIMESTAMP(3);

UPDATE "student_assignments" AS assignment
SET "selectedTaskId" = station."taskId",
    "taskSelectedAt" = CURRENT_TIMESTAMP
FROM "stations" AS station
WHERE assignment."stationId" = station."id"
  AND station."taskId" IS NOT NULL;

ALTER TABLE "student_assignments"
  ADD CONSTRAINT "student_assignments_selectedTaskId_fkey"
  FOREIGN KEY ("selectedTaskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "obstetric_options" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "programmeId" TEXT NOT NULL,
  "parentId" TEXT,
  "maxMarks" DOUBLE PRECISION NOT NULL DEFAULT 15,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "obstetric_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "obstetric_options_programmeId_parentId_name_key" ON "obstetric_options"("programmeId", "parentId", "name");
ALTER TABLE "obstetric_options" ADD CONSTRAINT "obstetric_options_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "obstetric_options" ADD CONSTRAINT "obstetric_options_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "obstetric_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "obstetric_evaluations" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "examinerId" TEXT NOT NULL,
  "anatomyMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "abnormalPregnancyMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 60,
  "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "obstetric_evaluations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "obstetric_evaluations_studentId_sessionId_examinerId_key" ON "obstetric_evaluations"("studentId", "sessionId", "examinerId");
ALTER TABLE "obstetric_evaluations" ADD CONSTRAINT "obstetric_evaluations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "obstetric_evaluations" ADD CONSTRAINT "obstetric_evaluations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "exam_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "obstetric_evaluations" ADD CONSTRAINT "obstetric_evaluations_examinerId_fkey" FOREIGN KEY ("examinerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "obstetric_selections" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "slot" INTEGER NOT NULL,
  "optionId" TEXT NOT NULL,
  "marks" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "obstetric_selections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "obstetric_selections_evaluationId_slot_key" ON "obstetric_selections"("evaluationId", "slot");
ALTER TABLE "obstetric_selections" ADD CONSTRAINT "obstetric_selections_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "obstetric_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "obstetric_selections" ADD CONSTRAINT "obstetric_selections_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "obstetric_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
