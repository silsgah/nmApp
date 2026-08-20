export function evaluateStudentEligibility(student, session, eligibleTaskCount) {
  if (!student?.isActive) return { eligible: false, reason: 'Student is inactive' };
  if (student.programmeId !== session.programmeId) return { eligible: false, reason: 'Programme does not match the session' };
  if (session.yearLevel != null && student.yearLevel == null) return { eligible: false, reason: 'Student year level is not configured' };
  if (session.yearLevel != null && student.yearLevel !== session.yearLevel) return { eligible: false, reason: `Student is Year ${student.yearLevel}, not Year ${session.yearLevel}` };
  if (eligibleTaskCount < 1) return { eligible: false, reason: 'No active tasks are mapped to this programme and year level' };
  return { eligible: true, reason: null };
}

export function validateScheduleSelection({ eligibleStudentIds, eligibleExaminerIds, studentIds, examinerIds }) {
  if (!Array.isArray(studentIds) || studentIds.length < 1) throw new Error('Select at least one eligible candidate');
  if (!Array.isArray(examinerIds) || examinerIds.length < 1) throw new Error('Select at least one eligible examiner');
  const allowedStudents = new Set(eligibleStudentIds);
  const allowedExaminers = new Set(eligibleExaminerIds);
  if (studentIds.some((id) => !allowedStudents.has(id))) throw new Error('One or more selected candidates are not eligible for this session');
  if (examinerIds.some((id) => !allowedExaminers.has(id))) throw new Error('One or more selected examiners are not eligible for this session');
}
