export async function requireAssessmentAccess(prisma, request, reply, { sessionId, studentId, allowStudent = false }) {
  if (request.user.role === 'ADMIN') return true;

  if (request.user.role === 'STUDENT') {
    if (allowStudent && request.user.id === studentId) return true;
    reply.code(403).send({ error: 'Forbidden' });
    return false;
  }

  if (request.user.role !== 'EXAMINER') {
    reply.code(403).send({ error: 'Forbidden' });
    return false;
  }

  const [examinerAssignment, studentAssignment] = await Promise.all([
    prisma.examinerAssignment.findFirst({
      where: { examinerId: request.user.id, station: { sessionId } },
      select: { id: true },
    }),
    prisma.studentAssignment.findFirst({
      where: { studentId, station: { sessionId } },
      select: { id: true },
    }),
  ]);

  if (!examinerAssignment || !studentAssignment) {
    reply.code(403).send({ error: 'You are not assigned to assess this student in this session' });
    return false;
  }
  return true;
}

export async function requireOpenSession(prisma, reply, sessionId) {
  const session = await prisma.examSession.findUnique({ where: { id: sessionId }, select: { status: true, programmeId: true } });
  if (!session) {
    reply.code(404).send({ error: 'Session not found' });
    return null;
  }
  if (!['ACTIVE', 'MARKING'].includes(session.status)) {
    reply.code(409).send({ error: 'This examination session is not open for scoring' });
    return null;
  }
  return session;
}
