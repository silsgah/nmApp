-- This rollback is intentionally guarded: collapsing multiple attempts into the
-- legacy one-scorecard-per-assignment model would lose examination data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "task_attempts" GROUP BY "studentAssignmentId" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Rollback refused: assignments with multiple task attempts exist';
  END IF;
END $$;

DROP TABLE IF EXISTS "result_publication_audits";
DROP TABLE IF EXISTS "assessment_audits";
ALTER TABLE "scorecards" DROP CONSTRAINT IF EXISTS "scorecards_taskAttemptId_fkey";
DROP INDEX IF EXISTS "scorecards_taskAttemptId_examinerAssignmentId_key";
ALTER TABLE "scorecards" DROP COLUMN IF EXISTS "taskAttemptId";
CREATE UNIQUE INDEX IF NOT EXISTS "scorecards_studentAssignmentId_examinerAssignmentId_key" ON "scorecards"("studentAssignmentId", "examinerAssignmentId");
DROP TABLE IF EXISTS "task_attempts";
DROP TYPE IF EXISTS "TaskAttemptStatus";
