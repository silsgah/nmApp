import { NextRequest } from "next/server";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { executeLookupClinicalGuidelines } from "../../../../../agent/tools/lookup_clinical_guidelines";
import { executeDraftClinicalComment } from "../../../../../agent/tools/draft_clinical_comment";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are the GAFCONM Senior Clinical Examiner Assistant, an expert AI copilot built to support human examiners during Nursing & Midwifery practical examinations (OSCE/OSPE) at the Ghana Armed Forces College of Nursing and Midwifery.

Core Directives:
1. Human examiners physically observe candidates and award final scores. Your role is to assist, clarify, suggest, and draft, NEVER to override or auto-submit scores.
2. Align all answers with GAFCONM practical examination rubrics for Registered General Nursing (RGN) and Registered Midwifery (RM).
3. Distinguish rating scales:
   - 0–2 Scale (Health Assessment Tasks): 0 = Not Done/Incorrect, 1 = Partially Done, 2 = Fully Done.
   - 0–4 Scale (RGN/RM Component Tasks): 0 = Omitted/Unsafe, 1 = Below Standard, 2 = Satisfactory, 3 = Proficient, 4 = Mastery.
4. Keep responses professional, clinically precise, concise, and well structured.
5. When asked to draft a scorecard comment, provide a clean, ready-to-use paragraph the examiner can insert directly.
6. Flag any missed critical safety steps immediately.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, stationContext } = await req.json();

    let contextualSystem = SYSTEM_PROMPT;
    if (stationContext) {
      contextualSystem += `\n\n[Active Exam Station Context]
Station Code: ${stationContext.stationCode || "N/A"}
Task: ${stationContext.taskName || "N/A"}
Rating Scale: ${stationContext.ratingScale || "0-4"}
Max Score: ${stationContext.maxScore || 100}
${stationContext.candidateNumber ? `Current Candidate: ${stationContext.candidateNumber}` : ""}`;
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

    // Offline fallback — used when API key is not yet configured
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
    } else if (lower.includes("scale") || lower.includes("score") || lower.includes("criteria") || lower.includes("rubric")) {
      reply = `**GAFCONM Rating Scale Guidance:**\n\n**0–4 Scale (RGN/RM Tasks):**\n- **0 – Omitted/Unsafe**: Step skipped or created a safety hazard\n- **1 – Below Standard**: Technique clumsy or significantly incomplete\n- **2 – Satisfactory**: Meets minimum competency and safety standards\n- **3 – Proficient**: Smooth execution with good patient communication\n- **4 – Mastery**: Flawless technique, efficiency, and clinical reasoning\n\n**0–2 Scale (Health Assessment):**\n- **0** – Not performed\n- **1** – Partially performed\n- **2** – Fully performed correctly`;
    } else if (lower.includes("safety") || lower.includes("critical") || lower.includes("fail")) {
      reply = `**Critical Safety Red Flags (GAFCONM Standards):**\n\n⚠️ The following constitute critical fails or mandatory score reductions:\n- Failure to verify patient identity before any procedure\n- Omitting hand hygiene before a sterile/invasive procedure\n- Breaking sterile field integrity without immediate correction\n- Incorrect drug calculation or unsafe administration technique\n- Failure to use PPE when clinically indicated\n- Abandoning the patient mid-procedure without delegation\n\nNote any of the above in the Remarks field with specifics.`;
    } else {
      const guide = executeLookupClinicalGuidelines(lower);
      reply = guide.length > 100 ? guide : `Hello Examiner! 👋 I am your **GAFCONM Clinical AI Assistant**.\n\nI can help you with:\n- **Draft Scorecard Remarks** for any candidate\n- **Rubric Clarification** on the 0–2 or 0–4 rating scale\n- **Safety Rule Checks** for RGN & RM practical tasks\n- **Clinical Procedure Guidelines** (catheterization, vital signs, care plans, aseptic technique)\n\nHow can I assist you${stationContext?.taskName ? ` with **${stationContext.taskName}**` : ""}?`;
    }

    // Return as proper AI SDK data stream format
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`0:${JSON.stringify(reply)}\n`));
        controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
    });
  } catch (err: any) {
    console.error("[Examiner Copilot] Chat error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
