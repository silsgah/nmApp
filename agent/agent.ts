/**
 * Vercel Eve Agent Runtime Config
 * Defines the model, reasoning, and context compaction rules for GAFCONM Examiner Copilot
 */

export interface AgentConfig {
  name: string;
  description: string;
  defaultModel: string;
  temperature: number;
}

export const examinerCopilotConfig: AgentConfig = {
  name: "gafconm-examiner-copilot",
  description: "Durable AI Copilot Assistant for GAFCONM Nursing & Midwifery Examiners",
  defaultModel: "gpt-4o",
  temperature: 0.2, // Low temperature for consistent clinical guidance
};
