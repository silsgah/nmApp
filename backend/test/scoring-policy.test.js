import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateExaminerScores, assertScoreWithinBounds, combineWeightedTaskPercentages } from '../src/lib/scoring-policy.js';

test('score bounds reject negative, excessive and non-finite marks', () => {
  assert.equal(assertScoreWithinBounds(40, 40), 40);
  assert.throws(() => assertScoreWithinBounds(41, 40), RangeError);
  assert.throws(() => assertScoreWithinBounds(-1, 40), RangeError);
  assert.throws(() => assertScoreWithinBounds(Number.NaN, 40), RangeError);
});

test('multiple examiner scores aggregate by configured method', () => {
  assert.equal(aggregateExaminerScores([60, 70, 80], 'AVERAGE'), 70);
  assert.equal(aggregateExaminerScores([60, 70, 80], 'HIGHEST'), 80);
  assert.equal(aggregateExaminerScores([10, 20, 30], 'SUM'), 60);
  assert.equal(aggregateExaminerScores([], 'AVERAGE'), 0);
});

test('two half-weight Minor tasks equal one full practical result', () => {
  const result = combineWeightedTaskPercentages([
    { percentage: 70, weight: 0.5 },
    { percentage: 80, weight: 0.5 },
  ]);
  assert.equal(result, 75);
});

test('a Major task with full weight preserves its percentage', () => {
  assert.equal(combineWeightedTaskPercentages([{ percentage: 75, weight: 1 }]), 75);
});

test('invalid percentages and zero total weight are rejected', () => {
  assert.throws(() => combineWeightedTaskPercentages([{ percentage: 101, weight: 1 }]), RangeError);
  assert.throws(() => combineWeightedTaskPercentages([{ percentage: 50, weight: 0 }]), RangeError);
});
