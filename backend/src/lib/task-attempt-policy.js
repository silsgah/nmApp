export function assertAttemptCanBeAdded({ assignedExaminerCount, submittedExaminerCount, hasCurrentAttempt }) {
  if (!hasCurrentAttempt) return;
  if (assignedExaminerCount < 1) throw new Error('At least one examiner must be assigned before selecting a task.');
  if (submittedExaminerCount < assignedExaminerCount) {
    throw new Error('Complete the current task with all assigned examiners before selecting another task.');
  }
}

export function isUniqueConstraintConflict(error) {
  return error?.code === 'P2002';
}
