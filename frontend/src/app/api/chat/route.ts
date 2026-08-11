import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { google } from "@ai-sdk/google";

export const maxDuration = 30;

// ── Inline clinical tools ──

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

// ── Extract plain text from any message format (v5 content string OR v6 parts array) ──
function extractText(msg: any): string {
  if (!msg) return "";
  if (typeof msg.content === "string" && msg.content.length > 0) return msg.content;
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text ?? "")
      .join("");
  }
  return "";
}

// ── System Prompts ──

const EXAMINER_SYSTEM_PROMPT = `You are the GAFCONM Senior Clinical Examiner Assistant, an expert AI copilot supporting human examiners during Nursing & Midwifery practical examinations (OSCE/OSPE) at the Ghana Armed Forces College of Nursing and Midwifery.

Core Directives:
1. Human examiners observe candidates and award final scores. Your role is to assist, clarify, and draft — NEVER auto-submit scores.
2. Align all answers with GAFCONM rubrics for RGN and RM programmes.
3. Rating scales:
   - 0–2 Scale (Health Assessment Tasks): 0 = Not Done, 1 = Partially Done, 2 = Fully Done.
   - 0–4 Scale (RGN/RM Component Tasks): 0 = Omitted/Unsafe, 1 = Below Standard, 2 = Satisfactory, 3 = Proficient, 4 = Mastery.
4. Keep responses professional, clinically precise, and concise.
5. When asked to draft a scorecard comment, provide a clean paragraph ready to paste.
6. Flag missed critical safety steps immediately.`;

const ADMIN_SYSTEM_PROMPT = `You are the GAFCONM Portal Administrator AI Assistant, an expert copilot assisting system administrators at the Ghana Armed Forces College of Nursing and Midwifery.

Core Directives:
1. Support admins with exam session configuration, scheduling candidates/examiners, task bank management, scorecard aggregation, care plan settings, assessment matrix, and result publishing.
2. Key System Concepts:
   - **Scheduling**: Automatically distributes candidates (prefixed with Index Numbers like RGN-2024-001-C001) and examiners across exam stations in DRAFT status. Requires at least 1 station created first.
   - **Pass Rules**: Overall pass mark is 50.0% by default. Score aggregation options: AVERAGE, SUM, or HIGHEST across assigned examiners.
   - **Task Bank**: Houses clinical tasks categorized into Basic Procedures, Advanced Procedures, Health Assessment, Basic Nursing, and Midwifery. Each task belongs to target year levels (Year 2 or Year 3).
   - **Assessment Matrix**: Provides a comprehensive overview of all candidate scores across all stations, including unsubmit capabilities for re-assessments.
3. Keep responses professional, clear, structural, and helpful.`;

// ── Build fallback reply (offline / error recovery) ──
function buildFallbackReply(lower: string, isAdmin: boolean, stationContext?: any, screenContext?: any): string {
  if (isAdmin) {
    if (lower.includes("schedule") || lower.includes("auto-assign") || lower.includes("assign")) {
      return `**Exam Session Scheduling Guidance:**\n\n- **Requirements**: The session must be in **DRAFT** status and have **at least 1 Station** created.\n- **Candidate Numbers**: Automatically generated as \`<Index Number>-C001\`, \`<Index Number>-C002\`...\n- **Examiners**: Distributed across stations using a round-robin rotation up to the configured \`examinerCount\` per station (default is 3).\n- **Reset**: Clicking **Schedule** clears and regenerates assignments cleanly.`;
    } else if (lower.includes("result") || lower.includes("publish") || lower.includes("grade") || lower.includes("pass")) {
      return `**Results & Pass Mark Rules:**\n\n- **Pass Mark**: Default overall pass mark is **50.0%**.\n- **Score Aggregation**: Aggregates examiner marks by **AVERAGE** (default), SUM, or HIGHEST score.\n- **Publishing**: Results can be published individually or in bulk to candidates after all station scorecards are submitted.\n- **Unsubmit**: If an examiner makes a mistake, admins can unsubmit scorecards via the Assessment Matrix for re-assessment.`;
    } else if (lower.includes("task") || lower.includes("bank") || lower.includes("procedure")) {
      return `**Task Bank Management:**\n\n- Tasks map to specific programmes (**RGN** / **RM**) and academic year levels (**Year 2** / **Year 3**).\n- Categories include **Basic Procedures**, **Advanced Procedures**, **Health Assessment**, **Basic Nursing**, and **Midwifery**.\n- Each task defines step-by-step rubrics and max scores (e.g. 80 marks).`;
    } else {
      return `Hello Administrator! 👋 I am your **GAFCONM Admin AI Assistant**.\n\nI can help you with:\n- **Scheduling Candidates & Examiners** for practical sessions\n- **Exam Config & Pass Mark Rules** (50% pass mark, score aggregation)\n- **Task Bank Management** for RGN and RM tasks\n- **Assessment Matrix & Results Publishing**\n\nHow can I help you on **${screenContext?.title || "this screen"}**?`;
    }
  }

  // Examiner fallback
  if (lower.includes("draft") || lower.includes("comment") || lower.includes("feedback") || lower.includes("remark")) {
    const draft = executeDraftClinicalComment({
      taskName: stationContext?.taskName || "Clinical Task",
      positives: ["Followed hand hygiene and patient privacy protocols", "Clear verbal communication throughout the procedure"],
      deficiencies: ["Minor hesitation during equipment assembly"],
      safetyViolations: lower.includes("sterile") || lower.includes("aseptic") ? ["Briefly contacted non-sterile drape edge"] : undefined,
    });
    return `**Draft Scorecard Feedback:**\n\n"${draft}"\n\n*Click "Insert into Scorecard" to paste this directly into the remarks field.*`;
  } else if (lower.includes("scale") || lower.includes("score") || lower.includes("rubric") || lower.includes("criteria")) {
    return `**GAFCONM Rating Scale Guidance:**\n\n**0–4 Scale (RGN/RM Tasks):**\n- **0 – Omitted/Unsafe**: Step skipped or created a safety hazard\n- **1 – Below Standard**: Technique clumsy or significantly incomplete\n- **2 – Satisfactory**: Meets minimum competency and safety standards\n- **3 – Proficient**: Smooth execution with good patient communication\n- **4 – Mastery**: Flawless technique, efficiency, and clinical reasoning\n\n**0–2 Scale (Health Assessment):**\n- **0** – Not performed\n- **1** – Partially performed\n- **2** – Fully and correctly performed`;
  } else if (lower.includes("safety") || lower.includes("critical") || lower.includes("fail")) {
    return `**Critical Safety Red Flags (GAFCONM):**\n\n⚠️ The following constitute critical fails:\n- Failure to verify patient identity before any procedure\n- Omitting hand hygiene before a sterile/invasive procedure\n- Breaking sterile field without immediate correction\n- Incorrect drug calculation or unsafe administration\n- Failure to use PPE when clinically indicated\n- Abandoning the patient mid-procedure without delegation\n\nDocument any of the above in the Remarks field with specifics.`;
  } else {
    const guide = executeLookupClinicalGuidelines(lower);
    return guide.length > 100 ? guide : `Hello Examiner! 👋 I am your **GAFCONM Clinical AI Assistant**.\n\nI can help you with:\n- **Draft Scorecard Remarks** for any candidate\n- **Rubric Clarification** on 0–2 or 0–4 rating scales\n- **Safety Rule Checks** for RGN & RM practical tasks\n- **Clinical Guidelines** (catheterization, vital signs, care plans, aseptic technique)\n\nHow can I assist you${stationContext?.taskName ? ` with **${stationContext.taskName}**` : ""}?`;
  }
}

// ── Build a UIMessageStream fallback response from a string ──
function buildFallbackResponse(reply: string) {
  const msgId = "msg-" + Date.now();
  const stream = createUIMessageStream({
    execute({ writer }) {
      // AI SDK v6 useChat requires: text-start → text-delta(s) → text-end
      writer.write({ type: "text-start", id: msgId });
      writer.write({ type: "text-delta", id: msgId, delta: reply });
      writer.write({ type: "text-end", id: msgId });
    },
  });
  return createUIMessageStreamResponse({ stream });
}


// ── Route Handler ──

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, stationContext, screenContext, role } = body;

    const isAdmin = role === "ADMIN" || Boolean(screenContext);
    let contextualSystem = isAdmin ? ADMIN_SYSTEM_PROMPT : EXAMINER_SYSTEM_PROMPT;

    if (screenContext) {
      contextualSystem += `\n\n[Active Admin Screen Context]
Page Title: ${screenContext.title || "N/A"}
Current Route: ${screenContext.route || "N/A"}
${screenContext.details ? `Details: ${screenContext.details}` : ""}`;
    }

    if (stationContext) {
      contextualSystem += `\n\n[Active Exam Station]
Station: ${stationContext.stationCode || "N/A"}
Task: ${stationContext.taskName || "N/A"}
Rating Scale: ${stationContext.ratingScale || "0-4"}
Max Score: ${stationContext.maxScore || 100}${stationContext.candidateNumber ? `\nCandidate: ${stationContext.candidateNumber}` : ""}`;
    }

    // Extract last message text for fallback
    const lastMsg = messages[messages.length - 1];
    const lastText = extractText(lastMsg);
    const lower = lastText.toLowerCase();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (apiKey) {
      try {
        // Convert UI messages (parts[] format) to model messages for the AI SDK
        const modelMessages = await convertToModelMessages(messages);
        const result = streamText({
          model: google("gemini-2.0-flash"),
          system: contextualSystem,
          messages: modelMessages,
        });

        // Use pipeUIMessageStreamToResponse pattern so we can catch errors
        // toUIMessageStreamResponse wraps errors inside the stream as error events,
        // which causes useChat to show "An error occurred." on the client.
        // Instead, we consume the textStream and if it works, great. If not, fallback.
        const textParts: string[] = [];
        try {
          for await (const chunk of result.textStream) {
            textParts.push(chunk);
          }
        } catch (streamReadErr) {
          console.warn("[Copilot] Google API stream failed, using fallback:", streamReadErr);
          // Google API failed mid-stream — return fallback
          return buildFallbackResponse(buildFallbackReply(lower, isAdmin, stationContext, screenContext));
        }

        // Successfully got the full response from Google — stream it back
        const fullText = textParts.join("");
        // If Google returned empty (bad key, quota, model issue), fall back
        if (fullText.trim().length > 0) {
          return buildFallbackResponse(fullText);
        }
        console.warn("[Copilot] Google API returned empty response, using fallback engine");

      } catch (conversionErr) {
        console.warn("[Copilot] convertToModelMessages or streamText init failed:", conversionErr);
        // Fall through to offline fallback
      }
    }

    // Offline / Fallback Engine
    return buildFallbackResponse(buildFallbackReply(lower, isAdmin, stationContext, screenContext));
  } catch (err: any) {
    console.error("[Copilot Error]", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
