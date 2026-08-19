import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationDir = new URL('../prisma/migrations/20260820000000_task_attempts_and_audit/', import.meta.url);

test('task-attempt migration backfills legacy selections and scorecards', async () => {
  const sql = await readFile(new URL('migration.sql', migrationDir), 'utf8');
  assert.match(sql, /CREATE TABLE "task_attempts"/);
  assert.match(sql, /INSERT INTO "task_attempts"/);
  assert.match(sql, /UPDATE "scorecards"/);
  assert.match(sql, /studentId_sessionId_taskId_key/);
  assert.match(sql, /CREATE TABLE "assessment_audits"/);
  assert.match(sql, /CREATE TABLE "result_publication_audits"/);
});

test('rollback refuses lossy conversion when multiple attempts exist', async () => {
  const sql = await readFile(new URL('rollback.sql', migrationDir), 'utf8');
  assert.match(sql, /HAVING COUNT\(\*\) > 1/);
  assert.match(sql, /Rollback refused/);
  assert.match(sql, /scorecards_studentAssignmentId_examinerAssignmentId_key/);
});
