export function validateExaminationReset({ expectedSessionName, confirmation, reason }) {
  if (String(confirmation || '').trim() !== String(expectedSessionName || '').trim()) {
    throw new Error('Type the exact session name to confirm this reset');
  }
  if (String(reason || '').trim().length < 10) {
    throw new Error('A reset reason of at least 10 characters is required');
  }
}
