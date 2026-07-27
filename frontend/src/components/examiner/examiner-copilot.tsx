"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { toast } from "sonner";
import {
  Sparkles, X, Send, Bot, User, Copy, Check, ShieldAlert,
  HelpCircle, FileText, CornerDownLeft, Maximize2, Minimize2, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ExaminerCopilotProps {
  stationContext?: {
    stationCode?: string;
    taskName?: string;
    ratingScale?: string;
    maxScore?: number;
    candidateNumber?: string;
  };
  onInsertRemark?: (remarkText: string) => void;
}

// Helper: extract text from a UIMessage (v5 uses parts[] not content string)
function getMessageText(msg: any): string {
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text ?? "")
      .join("");
  }
  return "";
}

export function ExaminerCopilot({ stationContext, onInsertRemark }: ExaminerCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    api: "/api/chat",
    body: { stationContext },
    onError: (err: Error) => {
      toast.error("Copilot error: " + (err.message || "Failed to reach assistant"));
    },
  } as any);

  const isLoading = status === "streaming" || status === "submitted";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleQuickPrompt = (text: string) => {
    setInputValue(text);
  };

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    setInputValue("");
    await sendMessage({ role: "user", parts: [{ type: "text", text: trimmed }] } as any);
  }, [inputValue, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, index: number) => {
    const clean = text.replace(/\*\*/g, "").replace(/^"|"$/g, "").trim();
    navigator.clipboard.writeText(clean);
    setCopiedIndex(index);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleInsert = (text: string) => {
    // Try to extract quoted content first
    const match = text.match(/"([^"]{10,})"/);
    const content = match ? match[1] : text.replace(/\*\*[^*]+\*\*:?\n?/g, "").replace(/^"|"$/gm, "").trim();
    if (onInsertRemark) {
      onInsertRemark(content);
      toast.success("Feedback inserted into scorecard remarks!", { icon: "✨" });
    } else {
      navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard — paste it into the Remarks field");
    }
  };

  const isDraftResponse = (text: string) =>
    text.includes("Scorecard") || text.includes("Draft") || text.includes('"');

  return (
    <>
      {/* ─── Floating Trigger Button ─── */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            id="examiner-copilot-trigger"
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 rounded-full px-5 py-3.5 shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white border border-white/20"
          >
            {/* Live dot */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="font-semibold text-sm tracking-wide">Examiner AI Copilot</span>
            {stationContext?.stationCode && (
              <Badge className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-mono border-0 ml-0.5">
                {stationContext.stationCode}
              </Badge>
            )}
          </button>
        </div>
      )}

      {/* ─── Chat Panel ─── */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 flex flex-col bg-card border border-border/50 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300",
            isExpanded
              ? "inset-4 md:left-auto md:right-4 md:top-4 md:bottom-4 md:w-[640px]"
              : "bottom-6 right-6 w-[380px] sm:w-[420px] h-[580px]"
          )}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border-b border-indigo-800/40 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/30 to-indigo-500/30 border border-amber-400/30 flex items-center justify-center">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">GAFCONM Copilot</h3>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono px-1.5 py-0">
                    LIVE
                  </Badge>
                </div>
                <p className="text-[11px] text-indigo-200/70 truncate max-w-[200px]">
                  {stationContext?.taskName ?? "Clinical Examiner Assistant"}
                  {stationContext?.ratingScale && ` · ${stationContext.ratingScale} scale`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
                title={isExpanded ? "Minimize" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Quick Action Chips ── */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/40 overflow-x-auto flex-shrink-0 no-scrollbar">
            {[
              { icon: FileText, label: "Draft Remark", color: "indigo", prompt: `Draft a professional scorecard remark for a candidate who showed good patient preparation and communication but missed the aseptic technique step during ${stationContext?.taskName ?? "the clinical procedure"}.` },
              { icon: HelpCircle, label: "Scale Guide", color: "teal", prompt: `Explain the criteria for each score level on the ${stationContext?.ratingScale ?? "0-4"} rating scale used at this station.` },
              { icon: ShieldAlert, label: "Safety Rules", color: "amber", prompt: `What are the critical patient safety red flags I should watch for during ${stationContext?.taskName ?? "this procedure"}?` },
            ].map(({ icon: Icon, label, color, prompt }) => (
              <button
                key={label}
                onClick={() => handleQuickPrompt(prompt)}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border flex-shrink-0 transition-all",
                  color === "indigo" && "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-400/20 hover:bg-indigo-500/20",
                  color === "teal" && "bg-teal-500/10 text-teal-600 dark:text-teal-300 border-teal-400/20 hover:bg-teal-500/20",
                  color === "amber" && "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-400/20 hover:bg-amber-500/20",
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* ── Message Thread ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-sm min-h-0">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-400/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-indigo-500" />
                </div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Ready to Assist</h4>
                <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                  Ask a question, use a quick action above, or request a draft scorecard remark for any candidate.
                </p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const text = getMessageText(m);
                const isUser = m.role === "user";
                return (
                  <div key={m.id ?? idx} className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}>
                    {/* AI Avatar */}
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                    )}

                    <div className={cn("flex flex-col gap-2 max-w-[82%]", isUser && "items-end")}>
                      {/* Bubble */}
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap shadow-sm",
                          isUser
                            ? "bg-indigo-600 text-white rounded-tr-sm"
                            : "bg-muted/60 border border-border/50 text-foreground rounded-tl-sm"
                        )}
                      >
                        {text}
                      </div>

                      {/* AI action bar */}
                      {!isUser && text && (
                        <div className="flex items-center gap-1.5 ml-1">
                          <button
                            onClick={() => handleCopy(text, idx)}
                            className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors border border-transparent hover:border-border/40"
                          >
                            {copiedIndex === idx
                              ? <><Check className="w-3 h-3 text-emerald-500" /> Copied</>
                              : <><Copy className="w-3 h-3" /> Copy</>
                            }
                          </button>
                          {isDraftResponse(text) && (
                            <button
                              onClick={() => handleInsert(text)}
                              className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-400/20 transition-colors"
                            >
                              <CornerDownLeft className="w-3 h-3" /> Insert into Scorecard
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* User Avatar */}
                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground pl-9">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500 flex-shrink-0" />
                <span>Copilot is analysing clinical criteria…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Bar ── */}
          <div className="p-3 border-t border-border/60 bg-card/80 backdrop-blur-sm flex items-center gap-2 flex-shrink-0">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about rubrics, safety rules, or request a comment draft…"
              disabled={isLoading}
              className="flex-1 min-w-0 bg-muted/50 border border-border/60 rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center flex-shrink-0 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
        </div>
      )}
    </>
  );
}
