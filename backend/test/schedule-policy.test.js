import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateStudentEligibility, validateScheduleSelection } from '../src/lib/schedule-policy.js';

const session = { programmeId: 'rm', yearLevel: 2 };

test('requires an exact configured programme and year level', () => {
  assert.equal(evaluateStudentEligibility({ isActive: true, programmeId: 'rm', yearLevel: 2 }, session, 3).eligible, true);
  assert.equal(evaluateStudentEligibility({ isActive: true, programmeId: 'rm', yearLevel: null }, session, 3).reason, 'Student year level is not configured');
  assert.equal(evaluateStudentEligibility({ isActive: true, programmeId: 'rm', yearLevel: 3 }, session, 3).eligible, false);
  assert.equal(evaluateStudentEligibility({ isActive: true, programmeId: 'rgn', yearLevel: 2 }, session, 3).eligible, false);
});

test('rejects scheduling when no eligible tasks exist', () => {
  assert.equal(evaluateStudentEligibility({ isActive: true, programmeId: 'rm', yearLevel: 2 }, session, 0).reason, 'No active tasks are mapped to this programme and year level');
});

test('only explicitly selected eligible candidates and examiners are accepted', () => {
  assert.doesNotThrow(() => validateScheduleSelection({ eligibleStudentIds: ['s1'], eligibleExaminerIds: ['e1'], studentIds: ['s1'], examinerIds: ['e1'] }));
  assert.throws(() => validateScheduleSelection({ eligibleStudentIds: ['s1'], eligibleExaminerIds: ['e1'], studentIds: ['s2'], examinerIds: ['e1'] }), /not eligible/);
  assert.throws(() => validateScheduleSelection({ eligibleStudentIds: ['s1'], eligibleExaminerIds: ['e1'], studentIds: [], examinerIds: ['e1'] }), /candidate/);
});
