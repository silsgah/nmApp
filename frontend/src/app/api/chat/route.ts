import { NextRequest } from "next/server";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";

export const maxDuration = 30;

// ── Inline clinical tools (agent/tools inlined here for Next.js bundler compatibility) ──

interface DraftClinicalCommentInput {
  taskName: string;
  positives: string[];
  deficiencies: string[];
  safetyViolations?: string[];
}

function executeDraftClinicalComment(input: DraftClinicalCommentInput): string {
  const parts: string[] = [];
  if (input.positives.length > 0)
    parts.push(`Demonstrated proficiency in: ${input.positives.join("; ")}.`);
  if (input.deficiencies.length > 0)
    parts.push(`Requires improvement in: ${input.deficiencies.join("; ")}.`);
  if (input.safetyViolations?.length)
    parts.push(`CRITICAL SAFETY NOTE: ${input.safetyViolations.join("; ")}.`);
  return parts.join(" ");
}

const CLINICAL_KNOWLEDGE_BASE: Record<string, string> = {
  aseptic: `GAFCONM Aseptic Technique Standard:
1. Wash hands using the WHO 7-step method before opening sterile packs.
2. Maintain a 2.5 cm (1-inch) non-sterile border around sterile drapes.
3. Never reach over or turn your back to an open sterile field.
4. Replace gloves immediately if contamination occurs.`,
  catheterization: `GAFCONM Catheterization Protocol:
1. Verify patient identity with 2 identifiers and confirm consent.
2. Maintain strict aseptic technique throughout setup and insertion.
3. Clean urethral meatus — single downward strokes (female) or circular (male).
4. Inflate retention balloon only after confirming urine flow.
5. Document catheter size (French), balloon volume (mL), urine colour.`,
  vital_signs: `GAFCONM Vital Signs Assessment:
1. Temperature: Calibrated thermometer; document route (oral/tympanic/axillary).
2. Pulse: Radial artery for 60 full seconds; note rate, rhythm, and volume.
3. Respiration: Count unobtrusively for 60 seconds; note depth and pattern.
4. BP: Cuff wrapping ≥80% arm circumference; inflate 30 mmHg above palpated systolic.`,
  care_plan: `GAFCONM Nursing Care Plan Standards:
1. Nursing Diagnosis: NANDA-I PES format (Problem related to Etiology as evidenced by Signs).
2. Goals: SMART — Specific, Measurable, Achievable, Realistic, Time-bound.
3. Interventions: Evidence-based nursing actions with clinical rationale.
4. Evaluation: State goal fully met / partially met / not met with justification.`,
};

function executeLookupClinicalGuidelines(topic: string): string {
  const lower = topic.toLowerCase();
  for (const [key, value] of Object.entries(CLINICAL_KNOWLEDGE_BASE)) {
    if (lower.includes(key)) return value;
  }
  return `GAFCONM Standard: Ensure candidate follows patient privacy, hand hygiene, equipment verification, ordered procedure steps, and proper clinical documentation.`;
}

// ── System Prompt ──

const SYSTEM_PROMPT = `You are the GAFCONM Senior Clinical Examiner Assistant, an expert AI copilot supporting human examiners during Nursing & Midwifery practical examinations (OSCE/OSPE) at the Ghana Armed Forces College of Nursing and Midwifery.

Core Directives:
1. Human examiners observe candidates and award final scores. Your role is to assist, clarify, and draft — NEVER auto-submit scores.
2. Align all answers with GAFCONM rubrics for RGN and RM programmes.
3. Rating scales:
   - 0–2 Scale (Health Assessment Tasks): 0 = Not Done, 1 = Partially Done, 2 = Fully Done.
   - 0–4 Scale (RGN/RM Component Tasks): 0 = Omitted/Unsafe, 1 = Below Standard, 2 = Satisfactory, 3 = Proficient, 4 = Mastery.
4. Keep responses professional, clinically precise, and concise.
5. When asked to draft a scorecard comment, provide a clean paragraph ready to paste.
6. Flag missed critical safety steps immediately.`;

// ── Route Handler ──

export async function POST(req: NextRequest) {
  try {
    const { messages, stationContext } = await req.json();

    let contextualSystem = SYSTEM_PROMPT;
    if (stationContext) {
      contextualSystem += `\n\n[Active Exam Station]
Station: ${stationContext.stationCode || "N/A"}
Task: ${stationContext.taskName || "N/A"}
Rating Scale: ${stationContext.ratingScale || "0-4"}
Max Score: ${stationContext.maxScore || 100}${stationContext.candidateNumber ? `\nCandidate: ${stationContext.candidateNumber}` : ""}`;
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (apiKey) {
      const result = streamText({
        model: google("gemini-2.0-flash"),
        system: contextualSystem,
        messages,
      });
      return result.toTextStreamResponse();
    }

    // Offline fallback when API key not yet configured
    const lastMsg = messages[messages.length - 1]?.content ?? "";
    const lower = (typeof lastMsg === "string" ? lastMsg : "").toLowerCase();
    let reply: string;

    if (lower.includes("draft") || lower.includes("comment") || lower.includes("feedback") || lower.includes("remark")) {
      const draft = executeDraftClinicalComment({
        taskName: stationContext?.taskName || "Clinical Task",
        positives: ["Followed hand hygiene and patient privacy protocols", "Clear verbal communication throughout the procedure"],
        deficiencies: ["Minor hesitation during equipment assembly"],
        safetyViolations: lower.includes("sterile") || lower.includes("aseptic") ? ["Briefly contacted non-sterile drape edge"] : undefined,
      });
      reply = `**Draft Scorecard Feedback:**\n\n"${draft}"\n\n*Click "Insert into Scorecard" to paste this directly into the remarks field.*`;
    } else if (lower.includes("scale") || lower.includes("score") || lower.includes("rubric") || lower.includes("criteria")) {
      reply = `**GAFCONM Rating Scale Guidance:**\n\n**0–4 Scale (RGN/RM Tasks):**\n- **0 – Omitted/Unsafe**: Step skipped or created a safety hazard\n- **1 – Below Standard**: Technique clumsy or significantly incomplete\n- **2 – Satisfactory**: Meets minimum competency and safety standards\n- **3 – Proficient**: Smooth execution with good patient communication\n- **4 – Mastery**: Flawless technique, efficiency, and clinical reasoning\n\n**0–2 Scale (Health Assessment):**\n- **0** – Not performed\n- **1** – Partially performed\n- **2** – Fully and correctly performed`;
    } else if (lower.includes("safety") || lower.includes("critical") || lower.includes("fail")) {
      reply = `**Critical Safety Red Flags (GAFCONM):**\n\n⚠️ The following constitute critical fails:\n- Failure to verify patient identity before any procedure\n- Omitting hand hygiene before a sterile/invasive procedure\n- Breaking sterile field without immediate correction\n- Incorrect drug calculation or unsafe administration\n- Failure to use PPE when clinically indicated\n- Abandoning the patient mid-procedure without delegation\n\nDocument any of the above in the Remarks field with specifics.`;
    } else {
      const guide = executeLookupClinicalGuidelines(lower);
      reply = guide.length > 100 ? guide : `Hello Examiner! 👋 I am your **GAFCONM Clinical AI Assistant**.\n\nI can help you with:\n- **Draft Scorecard Remarks** for any candidate\n- **Rubric Clarification** on 0–2 or 0–4 rating scales\n- **Safety Rule Checks** for RGN & RM practical tasks\n- **Clinical Guidelines** (catheterization, vital signs, care plans, aseptic technique)\n\nHow can I assist you${stationContext?.taskName ? ` with **${stationContext.taskName}**` : ""}?`;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(reply));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("[Examiner Copilot]", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
