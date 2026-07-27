export interface DraftClinicalCommentInput {
  candidateNumber?: string;
  taskName: string;
  positives: string[];
  deficiencies: string[];
  safetyViolations?: string[];
}

export function executeDraftClinicalComment(input: DraftClinicalCommentInput): string {
  const parts: string[] = [];

  if (input.positives.length > 0) {
    parts.push(`Demonstrated proficiency in: ${input.positives.join("; ")}.`);
  }

  if (input.deficiencies.length > 0) {
    parts.push(`Requires improvement in: ${input.deficiencies.join("; ")}.`);
  }

  if (input.safetyViolations && input.safetyViolations.length > 0) {
    parts.push(`CRITICAL SAFETY NOTE: ${input.safetyViolations.join("; ")}.`);
  }

  return parts.join(" ");
}
