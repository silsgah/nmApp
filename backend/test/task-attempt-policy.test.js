import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAttemptCanBeAdded, isUniqueConstraintConflict } from '../src/lib/task-attempt-policy.js';

test('first attempt can be selected and a later attempt waits for the full panel', () => {
  assert.doesNotThrow(() => assertAttemptCanBeAdded({ assignedExaminerCount: 2, submittedExaminerCount: 0, hasCurrentAttempt: false }));
  assert.throws(() => assertAttemptCanBeAdded({ assignedExaminerCount: 2, submittedExaminerCount: 1, hasCurrentAttempt: true }), /Complete the current task/);
  assert.doesNotThrow(() => assertAttemptCanBeAdded({ assignedExaminerCount: 2, submittedExaminerCount: 2, hasCurrentAttempt: true }));
});

test('database uniqueness conflicts are recognized as concurrent selection conflicts', () => {
  assert.equal(isUniqueConstraintConflict({ code: 'P2002' }), true);
  assert.equal(isUniqueConstraintConflict({ code: 'P2025' }), false);
});
