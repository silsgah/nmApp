import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAssessmentAccess, requireOpenSession } from '../src/lib/assessment-access.js';

function replyStub() {
  return {
    statusCode: 200,
    payload: null,
    code(value) { this.statusCode = value; return this; },
    send(value) { this.payload = value; return this; },
  };
}

test('admin can access any assessment record', async () => {
  const reply = replyStub();
  const allowed = await requireAssessmentAccess({}, { user: { role: 'ADMIN', id: 'admin' } }, reply, { sessionId: 's1', studentId: 'u1' });
  assert.equal(allowed, true);
  assert.equal(reply.statusCode, 200);
});

test('student can access only their own record when student access is enabled', async () => {
  const ownReply = replyStub();
  assert.equal(await requireAssessmentAccess({}, { user: { role: 'STUDENT', id: 'u1' } }, ownReply, { sessionId: 's1', studentId: 'u1', allowStudent: true }), true);

  const otherReply = replyStub();
  assert.equal(await requireAssessmentAccess({}, { user: { role: 'STUDENT', id: 'u1' } }, otherReply, { sessionId: 's1', studentId: 'u2', allowStudent: true }), false);
  assert.equal(otherReply.statusCode, 403);
});

test('examiner needs both examiner and student assignments in the session', async () => {
  const prisma = {
    examinerAssignment: { findFirst: async () => ({ id: 'ea1' }) },
    studentAssignment: { findFirst: async () => ({ id: 'sa1' }) },
  };
  const reply = replyStub();
  assert.equal(await requireAssessmentAccess(prisma, { user: { role: 'EXAMINER', id: 'e1' } }, reply, { sessionId: 's1', studentId: 'u1' }), true);

  prisma.studentAssignment.findFirst = async () => null;
  const deniedReply = replyStub();
  assert.equal(await requireAssessmentAccess(prisma, { user: { role: 'EXAMINER', id: 'e1' } }, deniedReply, { sessionId: 's1', studentId: 'u2' }), false);
  assert.equal(deniedReply.statusCode, 403);
});

test('only active or marking sessions accept assessment writes', async () => {
  const prisma = { examSession: { findUnique: async () => ({ status: 'ACTIVE', programmeId: 'p1' }) } };
  assert.deepEqual(await requireOpenSession(prisma, replyStub(), 's1'), { status: 'ACTIVE', programmeId: 'p1' });

  prisma.examSession.findUnique = async () => ({ status: 'COMPLETED', programmeId: 'p1' });
  const reply = replyStub();
  assert.equal(await requireOpenSession(prisma, reply, 's1'), null);
  assert.equal(reply.statusCode, 409);
});
