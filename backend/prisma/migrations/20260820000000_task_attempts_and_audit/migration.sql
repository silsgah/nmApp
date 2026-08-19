CREATE TYPE "TaskAttemptStatus" AS ENUM ('ACTIVE', 'REOPENED', 'ARCHIVED');

CREATE TABLE "task_attempts" (
  "id" TEXT NOT NULL,
  "studentAssignmentId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "categoryWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "status" "TaskAttemptStatus" NOT NULL DEFAULT 'ACTIVE',
  "selectedById" TEXT NOT NULL,
  "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reopenedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "task_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_attempts_studentId_sessionId_taskId_key" ON "task_attempts"("studentId", "sessionId", "taskId");
CREATE UNIQUE INDEX "task_attempts_studentAssignmentId_sequence_key" ON "task_attempts"("studentAssignmentId", "sequence");
ALTER TABLE "task_attempts" ADD CONSTRAINT "task_attempts_studentAssignmentId_fkey" FOREIGN KEY ("studentAssignmentId") REFERENCES "student_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_attempts" ADD CONSTRAINT "task_attempts_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "task_attempts" ("id", "studentAssignmentId", "taskId", "studentId", "sessionId", "sequence", "categoryWeight", "selectedById", "selectedAt")
SELECT 'legacy_' || assignment."id", assignment."id", assignment."selectedTaskId", assignment."studentId", station."sessionId", 1,
       COALESCE(category."weight", 1.0), COALESCE(assignment."taskSelectedById", 'SYSTEM_BACKFILL'), COALESCE(assignment."taskSelectedAt", assignment."createdAt")
FROM "student_assignments" assignment
JOIN "stations" station ON station."id" = assignment."stationId"
JOIN "tasks" task ON task."id" = assignment."selectedTaskId"
LEFT JOIN "assessment_categories" category ON category."id" = task."categoryId"
WHERE assignment."selectedTaskId" IS NOT NULL;

ALTER TABLE "scorecards" ADD COLUMN "taskAttemptId" TEXT;
UPDATE "scorecards" scorecard SET "taskAttemptId" = 'legacy_' || scorecard."studentAssignmentId"
WHERE EXISTS (SELECT 1 FROM "task_attempts" attempt WHERE attempt."id" = 'legacy_' || scorecard."studentAssignmentId");
DROP INDEX IF EXISTS "scorecards_studentAssignmentId_examinerAssignmentId_key";
CREATE UNIQUE INDEX "scorecards_taskAttemptId_examinerAssignmentId_key" ON "scorecards"("taskAttemptId", "examinerAssignmentId");
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_taskAttemptId_fkey" FOREIGN KEY ("taskAttemptId") REFERENCES "task_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "assessment_audits" (
  "id" TEXT NOT NULL,
  "taskAttemptId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assessment_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "assessment_audits_taskAttemptId_createdAt_idx" ON "assessment_audits"("taskAttemptId", "createdAt");
ALTER TABLE "assessment_audits" ADD CONSTRAINT "assessment_audits_taskAttemptId_fkey" FOREIGN KEY ("taskAttemptId") REFERENCES "task_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "result_publication_audits" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "result_publication_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "result_publication_audits_sessionId_createdAt_idx" ON "result_publication_audits"("sessionId", "createdAt");
ALTER TABLE "result_publication_audits" ADD CONSTRAINT "result_publication_audits_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "exam_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
