import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExaminationReset } from '../src/lib/examination-reset-policy.js';

test('examination reset requires exact session name and a meaningful audit reason', () => {
  assert.throws(() => validateExaminationReset({ expectedSessionName: '2026 Finals', confirmation: '2026 Final', reason: 'Valid reset reason' }), /exact session name/);
  assert.throws(() => validateExaminationReset({ expectedSessionName: '2026 Finals', confirmation: '2026 Finals', reason: 'short' }), /at least 10/);
  assert.doesNotThrow(() => validateExaminationReset({ expectedSessionName: '2026 Finals', confirmation: '2026 Finals', reason: 'Restarting controlled staging examination' }));
});
