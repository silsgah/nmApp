const CLINICAL_KNOWLEDGE_BASE: Record<string, string> = {
  aseptic: `GAFCONM Aseptic Technique Standard:
1. Wash hands using the WHO 7-step method before opening sterile packs.
2. Maintain a 2.5 cm (1-inch) non-sterile border around sterile drapes.
3. Never reach over or turn your back to an open sterile field.
4. Replace gloves immediately if contamination occurs.`,

  catheterization: `GAFCONM Catheterization Protocol:
1. Verify patient identity with 2 identifiers and confirm consent.
2. Maintain strict aseptic technique throughout setup and insertion.
3. Clean urethral meatus with antiseptic swabs — single downward strokes (female) or circular (male).
4. Inflate retention balloon only after confirming urine flow in tubing.
5. Document catheter size (French), balloon volume (mL), and urine colour.`,

  vital_signs: `GAFCONM Vital Signs Assessment Standard:
1. Temperature: Use calibrated thermometer; document route (oral/tympanic/axillary).
2. Pulse: Palpate radial artery for 60 full seconds; note rate, rhythm, and volume.
3. Respiration: Count unobtrusively for 60 seconds; note depth and pattern.
4. Blood Pressure: Select cuff wrapping ≥80% arm circumference; inflate 30 mmHg above estimated systolic.`,

  care_plan: `GAFCONM Nursing Care Plan Standards:
1. Nursing Diagnosis: Must follow NANDA-I PES format (Problem related to Etiology as evidenced by Signs/Symptoms).
2. Goals/Objectives: Must be SMART — Specific, Measurable, Achievable, Realistic, Time-bound.
3. Nursing Interventions: Evidence-based actions with clinical rationale for each step.
4. Evaluation: State whether the goal was fully met, partially met, or not met, with justification.`,
};

export function executeLookupClinicalGuidelines(topic: string): string {
  const lower = topic.toLowerCase();
  for (const [key, value] of Object.entries(CLINICAL_KNOWLEDGE_BASE)) {
    if (lower.includes(key)) {
      return value;
    }
  }
  return `GAFCONM Standard Practical Exam Guidelines: Ensure candidate follows patient privacy, hand hygiene, equipment verification, ordered procedure steps, and proper clinical documentation.`;
}
