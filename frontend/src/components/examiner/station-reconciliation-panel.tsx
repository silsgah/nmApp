"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Clock,
  MessageSquare,
  FileSpreadsheet,
  Users,
  Star,
  Info,
  RotateCcw,
  Loader2,
  Quote,
  Calendar,
  Award,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ExaminerReconciliationItem {
  id?: string;
  examinerId: string;
  examinerName: string;
  staffId: string | null;
  isSelf: boolean;
  status: "SUBMITTED" | "DRAFT" | "NOT_STARTED";
  isSubmitted: boolean;
  totalScore: number | null;
  percentageScore: number | null;
  remarks: string | null;
  submittedAt: string | null;
  isMasked: boolean;
}

export interface ReconciliationSummary {
  totalAssigned: number;
  totalSubmitted: number;
  isBlindMasked: boolean;
  meanScore: number | null;
  meanPercentage: number | null;
  minPercentage: number | null;
  maxPercentage: number | null;
  scoreSpread: number | null;
  percentageSpread: number | null;
  varianceLevel: "PENDING" | "LOW" | "MODERATE" | "HIGH";
  hasHighVariance: boolean;
}

export interface TaskStep {
  id: string;
  stepNumber: number;
  description: string;
  isKeyStep?: boolean;
}

interface StationReconciliationPanelProps {
  candidateName: string;
  candidateNumber: string;
  taskName: string;
  maxScore: number;
  ratingScale?: string;
  steps?: TaskStep[];
  reconciliation: ExaminerReconciliationItem[];
  summary?: ReconciliationSummary;
  selfScorecardId?: string;
  onReexaminationComplete?: () => void;
}

/**
 * Safely parse remarks JSON from scorecard.
 * Prevents raw JSON strings from leaking to the UI when narrative text is empty.
 */
function parseExaminerRemarks(remarksRaw: string | null | undefined): {
  text: string;
  ratings: Record<string, number>;
} {
  if (!remarksRaw) return { text: "", ratings: {} };
  try {
    const parsed = JSON.parse(remarksRaw);
    if (parsed && typeof parsed === "object") {
      const ratings =
        parsed.ratings && typeof parsed.ratings === "object" ? parsed.ratings : {};
      const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
      return { text, ratings };
    }
    return { text: String(remarksRaw).trim(), ratings: {} };
  } catch {
    const trimmed = String(remarksRaw).trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return { text: "", ratings: {} };
    }
    return { text: trimmed, ratings: {} };
  }
}

export function StationReconciliationPanel({
  candidateName,
  candidateNumber,
  taskName,
  maxScore,
  ratingScale = "SCALE_0_4",
  steps = [],
  reconciliation = [],
  summary,
  selfScorecardId,
  onReexaminationComplete,
}: StationReconciliationPanelProps) {
  const [stepComparisonOpen, setStepComparisonOpen] = useState(false);
  const [activeRemarkModal, setActiveRemarkModal] = useState<{
    examinerName: string;
    staffId: string | null;
    isSelf: boolean;
    text: string;
    hasText: boolean;
    totalScore: number | null;
    percentageScore: number | null;
    submittedAt: string | null;
    ratings: Record<string, number>;
  } | null>(null);
  const [reexamining, setReexamining] = useState(false);

  const isBlindMasked = summary?.isBlindMasked ?? true;
  const submittedItems = reconciliation.filter((r) => r.isSubmitted);
  const unmaskedSubmittedItems = reconciliation.filter(
    (r) => r.isSubmitted && !r.isMasked && r.totalScore !== null
  );

  // Parse step ratings and clean text remarks from each unmasked examiner
  const examinerStepRatings = unmaskedSubmittedItems.map((ex) => {
    const { text, ratings } = parseExaminerRemarks(ex.remarks);
    return {
      examinerId: ex.examinerId,
      examinerName: ex.examinerName,
      staffId: ex.staffId,
      isSelf: ex.isSelf,
      totalScore: ex.totalScore,
      percentageScore: ex.percentageScore,
      ratings,
      text,
    };
  });

  const scaleMax = ratingScale === "SCALE_0_4" ? 4 : 2;

  // Find self scorecard ID from reconciliation data
  const selfExaminer = reconciliation.find((r) => r.isSelf && r.isSubmitted);
  const effectiveScorecardId = selfScorecardId || selfExaminer?.id;

  // Re-examination handler
  const handleReexamine = async () => {
    if (!effectiveScorecardId) {
      toast.error("Could not find your scorecard to re-examine.");
      return;
    }
    setReexamining(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${apiUrl}/scorecards/${effectiveScorecardId}/reexamine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Re-examination request failed");
      }
      toast.success("Scorecard re-opened for revision. You can now update your ratings.");
      if (onReexaminationComplete) {
        onReexaminationComplete();
      } else {
        window.location.reload();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Re-examination failed. Please try again.");
    } finally {
      setReexamining(false);
    }
  };

  return (
    <>
      <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden bg-card">
        {/* Header */}
        <CardHeader className="px-5 py-4 bg-muted/15 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <span>Station Score Reconciliation & Peer Consensus</span>
                  <Badge
                    variant="outline"
                    className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 text-[10px] font-semibold"
                  >
                    {reconciliation.length} Assigned Examiners
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Multi-examiner consensus tracking for candidate{" "}
                  <strong className="text-foreground">{candidateName}</strong> ({candidateNumber})
                </CardDescription>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isBlindMasked ? (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 text-xs font-semibold px-2.5 py-1 gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  Blind Scoring Mode
                </Badge>
              ) : summary?.hasHighVariance ? (
                <Badge
                  variant="destructive"
                  className="text-xs font-semibold px-2.5 py-1 gap-1.5 shadow-2xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  High Discrepancy ({summary?.percentageSpread}% Spread)
                </Badge>
              ) : summary?.varianceLevel === "LOW" ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 text-xs font-semibold px-2.5 py-1 gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Strong Consensus ({summary?.percentageSpread}% Spread)
                </Badge>
              ) : summary?.varianceLevel === "MODERATE" ? (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 text-xs font-semibold px-2.5 py-1 gap-1.5"
                >
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  Moderate Variance ({summary?.percentageSpread}% Spread)
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs font-semibold px-2.5 py-1 text-muted-foreground"
                >
                  Awaiting Co-Examiners
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Policy Guidance Alert */}
          {isBlindMasked ? (
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Independent Clinical Assessment Active</p>
                <p className="mt-0.5 text-amber-800 dark:text-amber-300/90">
                  To protect objectivity and prevent scoring bias, peer examiners&apos; numerical marks remain confidential until you finalize and submit your scorecard for this candidate.
                </p>
              </div>
            </div>
          ) : summary?.hasHighVariance ? (
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-red-200/80 bg-red-50/60 dark:bg-red-950/20 dark:border-red-900/40 text-xs text-red-900 dark:text-red-200 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  Attention Required: Scoring Variance ({summary?.percentageSpread}%) Exceeds 15%
                </p>
                <p className="mt-0.5 text-red-800 dark:text-red-300/90">
                  There is a significant scoring spread across assigned examiners for this candidate. Station examiners should review the step breakdown together to reach consensus. You may request a re-examination to revise your scores.
                </p>
              </div>
            </div>
          ) : null}

          {/* Examiners Roster Table */}
          <div className="rounded-xl border border-border/70 overflow-hidden shadow-2xs">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[34%] text-xs font-bold">Assigned Examiner</TableHead>
                  <TableHead className="w-[18%] text-xs font-bold">Status</TableHead>
                  <TableHead className="w-[18%] text-xs font-bold">Score Awarded</TableHead>
                  <TableHead className="w-[15%] text-xs font-bold text-right">Percentage</TableHead>
                  <TableHead className="w-[15%] text-xs font-bold text-center">Feedback & Marks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliation.map((examiner) => {
                  const initials = examiner.examinerName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  // Extract clean text remarks and ratings
                  const { text: cleanRemarkText, ratings: examinerRatings } = parseExaminerRemarks(
                    examiner.remarks
                  );
                  const hasWrittenRemark = cleanRemarkText.length > 0;

                  return (
                    <TableRow
                      key={examiner.examinerId}
                      className={cn(
                        examiner.isSelf ? "bg-primary/5 font-medium" : "hover:bg-muted/20"
                      )}
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                              examiner.isSelf
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                                {examiner.examinerName}
                              </span>
                              {examiner.isSelf && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary border-primary/30"
                                >
                                  You
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {examiner.staffId ? `Staff ID: ${examiner.staffId}` : "Clinical Examiner"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        {examiner.isSubmitted ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Submitted
                          </span>
                        ) : examiner.status === "DRAFT" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Drafting...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
                            Not Started
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="py-3">
                        {examiner.isMasked ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                            <Lock className="w-3 h-3 text-amber-600" />
                            Masked
                          </span>
                        ) : examiner.totalScore !== null ? (
                          <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                            {examiner.totalScore} / {maxScore} pts
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        {examiner.isMasked ? (
                          <span className="text-xs text-muted-foreground font-mono">🔒</span>
                        ) : examiner.percentageScore !== null ? (
                          <div className="flex flex-col items-end">
                            <span
                              className={cn(
                                "font-mono text-xs sm:text-sm font-bold",
                                examiner.percentageScore >= 50
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400"
                              )}
                            >
                              {examiner.percentageScore.toFixed(1)}%
                            </span>
                            {summary?.meanPercentage !== null && summary?.meanPercentage !== undefined && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {examiner.percentageScore - summary.meanPercentage >= 0 ? "+" : ""}
                                {(examiner.percentageScore - summary.meanPercentage).toFixed(1)}% vs avg
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Feedback & Marks Action Column */}
                      <TableCell className="py-3 text-center">
                        {examiner.isMasked ? (
                          <span className="text-xs text-muted-foreground font-mono">🔒</span>
                        ) : examiner.isSubmitted ? (
                          <Button
                            variant={hasWrittenRemark ? "outline" : "ghost"}
                            size="sm"
                            onClick={() =>
                              setActiveRemarkModal({
                                examinerName: examiner.examinerName,
                                staffId: examiner.staffId,
                                isSelf: examiner.isSelf,
                                text: cleanRemarkText,
                                hasText: hasWrittenRemark,
                                totalScore: examiner.totalScore,
                                percentageScore: examiner.percentageScore,
                                submittedAt: examiner.submittedAt,
                                ratings: examinerRatings,
                              })
                            }
                            className={cn(
                              "h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer rounded-lg shadow-2xs transition-all",
                              hasWrittenRemark
                                ? "border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-800 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/50"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            )}
                            title={hasWrittenRemark ? "View Clinical Notes & Step Marks" : "View Step Marks Breakdown"}
                          >
                            {hasWrittenRemark ? (
                              <>
                                <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span>Notes & Marks</span>
                              </>
                            ) : (
                              <>
                                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Marks</span>
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Consensus Metrics Summary Cards (When unmasked) */}
          {!isBlindMasked && summary?.meanScore !== null && summary?.meanScore !== undefined && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Consensus Mean Score
                </p>
                <p className="text-xl font-black text-foreground mt-1">
                  {summary.meanScore} / {maxScore} pts
                </p>
                <p className="text-xs font-semibold text-primary mt-0.5">
                  {summary.meanPercentage}% Average
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Discrepancy Spread (Max - Min)
                </p>
                <p
                  className={cn(
                    "text-xl font-black mt-1",
                    summary.hasHighVariance
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground"
                  )}
                >
                  {summary.percentageSpread}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Difference: {summary.scoreSpread} pts
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Station Quorum
                </p>
                <p className="text-xl font-black text-foreground mt-1">
                  {summary.totalSubmitted} of {summary.totalAssigned}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Examiners submitted marks
                </p>
              </div>
            </div>
          )}

          {/* Action Row */}
          {steps.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
              <div className="text-xs text-muted-foreground">
                {!isBlindMasked ? (
                  unmaskedSubmittedItems.length >= 2 ? (
                    <span>
                      Examine itemized step scoring differences across all{" "}
                      <strong className="text-foreground">{unmaskedSubmittedItems.length}</strong> submitted examiners.
                    </span>
                  ) : (
                    <span>
                      You have submitted your scorecard. Once co-examiners submit, their ratings will appear side-by-side.
                    </span>
                  )
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                    <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    Submit this candidate&apos;s score above to unlock peer reconciliation and step ratings.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Re-Examination Button */}
                {!isBlindMasked && selfExaminer && effectiveScorecardId && (summary?.varianceLevel === "MODERATE" || summary?.hasHighVariance) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReexamine}
                    disabled={reexamining}
                    className="h-8.5 px-3.5 text-xs font-semibold gap-1.5 cursor-pointer border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 shadow-xs"
                  >
                    {reexamining ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>{reexamining ? "Re-opening..." : "Request Re-Examination"}</span>
                  </Button>
                )}

                {/* Compare Step Ratings */}
                {!isBlindMasked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStepComparisonOpen(true)}
                    className="h-8.5 px-3.5 text-xs font-semibold gap-1.5 cursor-pointer border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shadow-xs flex-shrink-0"
                    id="compare-step-ratings-btn"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Compare Step Ratings</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] ml-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200"
                    >
                      {unmaskedSubmittedItems.length} Examiner{unmaskedSubmittedItems.length === 1 ? "" : "s"}
                    </Badge>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="h-8.5 px-3.5 text-xs font-medium gap-1.5 opacity-60 cursor-not-allowed flex-shrink-0 border-dashed"
                    title="Submit your scorecard first to unlock peer step comparison"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Compare Step Ratings (Locked)</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          STEP-BY-STEP COMPARISON DIALOG — Full-width professional modal
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={stepComparisonOpen} onOpenChange={setStepComparisonOpen}>
        <DialogContent
          className="sm:max-w-5xl w-[96vw] max-h-[90vh] flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-background"
          showCloseButton={false}
        >
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b border-border/60 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50/50 dark:from-indigo-950/30 dark:via-background dark:to-slate-950/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Step-by-Step Examiner Ratings Comparison
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>Candidate: <strong className="text-foreground">{candidateName}</strong> ({candidateNumber})</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>Task: <strong className="text-foreground">{taskName}</strong></span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>Scale: <strong className="text-foreground">0–{scaleMax}</strong></span>
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStepComparisonOpen(false)}
                className="h-8 w-8 p-0 rounded-lg cursor-pointer hover:bg-muted flex-shrink-0"
              >
                ✕
              </Button>
            </div>

            {/* Examiner Legend */}
            {examinerStepRatings.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {examinerStepRatings.map((ex, i) => {
                  const colors = [
                    "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800",
                    "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800",
                    "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800",
                    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800",
                    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
                  ];
                  return (
                    <Badge
                      key={ex.examinerId}
                      variant="outline"
                      className={cn("text-[11px] font-semibold px-2 py-0.5 gap-1", colors[i % colors.length])}
                    >
                      <Users className="w-3 h-3" />
                      {ex.examinerName.split(" ")[0]} {ex.isSelf ? "(You)" : ""}
                      <span className="font-mono font-black ml-1">
                        {ex.totalScore}/{maxScore}
                      </span>
                    </Badge>
                  );
                })}
              </div>
            )}
          </DialogHeader>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Awaiting notice */}
            {examinerStepRatings.length === 1 && (
              <div className="mx-6 mt-4 p-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/60 dark:bg-indigo-950/20 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Awaiting Co-Examiner Submissions</p>
                  <p className="text-indigo-800 dark:text-indigo-300/90 mt-0.5">
                    You have submitted your step ratings below. When your co-examiner(s) finalize their scorecards, their marks will populate side-by-side in this table for reconciliation.
                  </p>
                </div>
              </div>
            )}

            {/* Comparison Table */}
            <div className="p-6">
              <div className="rounded-xl border border-border/70 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-12 text-center text-xs font-bold sticky left-0 bg-muted/40 z-10">#</TableHead>
                        <TableHead className="text-xs font-bold min-w-[200px]">Procedure Step</TableHead>
                        {examinerStepRatings.map((ex, i) => {
                          const headerColors = [
                            "text-indigo-700 dark:text-indigo-300",
                            "text-violet-700 dark:text-violet-300",
                            "text-cyan-700 dark:text-cyan-300",
                            "text-rose-700 dark:text-rose-300",
                            "text-amber-700 dark:text-amber-300",
                          ];
                          return (
                            <TableHead
                              key={ex.examinerId}
                              className={cn("text-center text-xs font-bold whitespace-nowrap px-4", headerColors[i % headerColors.length])}
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-bold">{ex.examinerName.split(" ")[0]}</span>
                                <span className="text-[10px] font-normal text-muted-foreground font-mono">
                                  {ex.isSelf ? "(You)" : ex.staffId || "Examiner"}
                                </span>
                              </div>
                            </TableHead>
                          );
                        })}
                        <TableHead className="w-28 text-center text-xs font-bold">Agreement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {steps.map((step) => {
                        const ratingsForStep = examinerStepRatings.map(
                          (ex) => ex.ratings[step.id] ?? null
                        );
                        const validRatings = ratingsForStep.filter((r) => r !== null) as number[];

                        const isUnanimous =
                          validRatings.length > 0 &&
                          validRatings.every((r) => r === validRatings[0]);

                        const minRating = validRatings.length > 0 ? Math.min(...validRatings) : 0;
                        const maxRating = validRatings.length > 0 ? Math.max(...validRatings) : 0;
                        const stepGap = maxRating - minRating;

                        return (
                          <TableRow
                            key={step.id}
                            className={cn(
                              !isUnanimous && validRatings.length > 1
                                ? "bg-amber-50/40 dark:bg-amber-950/15"
                                : "hover:bg-muted/20"
                            )}
                          >
                            <TableCell className="text-center font-bold text-xs py-3 text-muted-foreground sticky left-0 bg-inherit z-10">
                              {step.stepNumber}
                            </TableCell>

                            <TableCell className="py-3">
                              <div className="flex items-start gap-2">
                                <span className="text-xs text-foreground leading-relaxed">
                                  {step.description}
                                </span>
                                {step.isKeyStep && (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 text-[10px] font-semibold gap-1 flex-shrink-0"
                                  >
                                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-600" />
                                    Key
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {examinerStepRatings.map((ex, i) => {
                              const r = ex.ratings[step.id];
                              const cellColors = [
                                { bg: "bg-indigo-100/60 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-300" },
                                { bg: "bg-violet-100/60 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-300" },
                                { bg: "bg-cyan-100/60 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-300" },
                                { bg: "bg-rose-100/60 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-300" },
                                { bg: "bg-amber-100/60 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
                              ];
                              const color = cellColors[i % cellColors.length];
                              return (
                                <TableCell
                                  key={ex.examinerId}
                                  className="text-center py-3 font-mono font-bold text-sm"
                                >
                                  {r !== undefined && r !== null ? (
                                    <span
                                      className={cn(
                                        "inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm",
                                        r === 0
                                          ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 ring-1 ring-red-300 dark:ring-red-800"
                                          : r === scaleMax
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-800"
                                            : cn(color.bg, color.text)
                                      )}
                                    >
                                      {r}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/50">—</span>
                                  )}
                                </TableCell>
                              );
                            })}

                            <TableCell className="text-center py-3">
                              {validRatings.length < 2 ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : isUnanimous ? (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 text-[10px] font-semibold gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Agree
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 text-[10px] font-semibold gap-1"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  Δ{stepGap}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {/* Summary Row — Total Scores */}
                      {examinerStepRatings.length > 0 && (
                        <TableRow className="bg-muted/30 border-t-2 border-border/80 font-bold">
                          <TableCell className="text-center py-3 sticky left-0 bg-muted/30 z-10">
                            <Award className="w-4 h-4 mx-auto text-muted-foreground" />
                          </TableCell>
                          <TableCell className="py-3 text-xs font-bold text-foreground uppercase tracking-wide">
                            Total Score
                          </TableCell>
                          {examinerStepRatings.map((ex) => (
                            <TableCell key={ex.examinerId} className="text-center py-3">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-mono font-black text-sm text-foreground">
                                  {ex.totalScore}/{maxScore}
                                </span>
                                <span className={cn(
                                  "text-[10px] font-bold",
                                  (ex.percentageScore ?? 0) >= 50
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-red-600 dark:text-red-400"
                                )}>
                                  {ex.percentageScore?.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                          ))}
                          <TableCell className="text-center py-3">
                            {summary?.meanPercentage !== null && summary?.meanPercentage !== undefined && (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Mean</span>
                                <span className="font-mono font-black text-sm text-primary">
                                  {summary.meanPercentage}%
                                </span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3.5 border-t border-border/60 bg-muted/15 flex flex-col sm:flex-row items-center justify-between gap-3 -mx-0 -mb-0 rounded-b-2xl">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
              Steps with rating differences are highlighted in amber. 0 = red, {scaleMax} = green.
            </p>
            <div className="flex items-center gap-2">
              {/* Re-Examination from within dialog */}
              {!isBlindMasked && selfExaminer && effectiveScorecardId && (summary?.varianceLevel === "MODERATE" || summary?.hasHighVariance) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReexamine}
                  disabled={reexamining}
                  className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                >
                  {reexamining ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  Re-Examine
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStepComparisonOpen(false)}
                className="cursor-pointer h-8 px-4"
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          FEEDBACK / REMARKS MODAL — Professional Assessment Card
          ═══════════════════════════════════════════════════════════════ */}
      {activeRemarkModal && (
        <Dialog open onOpenChange={() => setActiveRemarkModal(null)}>
          <DialogContent
            className="sm:max-w-2xl w-[95vw] max-h-[85vh] flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-background"
            showCloseButton={false}
          >
            {/* Modal Header */}
            <DialogHeader className="px-6 py-4 border-b border-border/60 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 dark:from-slate-950 dark:via-background dark:to-indigo-950/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <span>Examiner Assessment & Feedback</span>
                      {activeRemarkModal.isSelf && (
                        <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/30">
                          Your Scorecard
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Candidate: <strong className="text-foreground">{candidateName}</strong> ({candidateNumber}) · Task: <strong className="text-foreground">{taskName}</strong>
                    </DialogDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveRemarkModal(null)}
                  className="h-8 w-8 p-0 rounded-lg cursor-pointer hover:bg-muted flex-shrink-0"
                >
                  ✕
                </Button>
              </div>
            </DialogHeader>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-5">
              {/* Examiner Profile & Score Header */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shadow-xs flex-shrink-0",
                    activeRemarkModal.isSelf
                      ? "bg-primary text-primary-foreground"
                      : "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                  )}>
                    {activeRemarkModal.examinerName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      {activeRemarkModal.examinerName}
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {activeRemarkModal.staffId ? `Staff ID: ${activeRemarkModal.staffId}` : "Clinical Examiner"}
                    </p>
                    {activeRemarkModal.submittedAt && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3 text-muted-foreground/70" />
                        <span>
                          Submitted {new Date(activeRemarkModal.submittedAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score awarded card */}
                {activeRemarkModal.totalScore !== null && (
                  <div className="p-3 rounded-lg bg-background border border-border/60 flex items-center gap-4 flex-shrink-0">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Score Awarded
                      </span>
                      <span className="font-mono text-lg font-black text-foreground">
                        {activeRemarkModal.totalScore} / {maxScore} pts
                      </span>
                    </div>
                    <div className="text-right pl-3 border-l border-border/60">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Grade
                      </span>
                      <Badge className={cn(
                        "text-xs font-bold px-2 py-0.5 mt-0.5 shadow-xs",
                        (activeRemarkModal.percentageScore ?? 0) >= 50
                          ? "bg-emerald-500 hover:bg-emerald-500 text-white"
                          : "bg-red-500 hover:bg-red-500 text-white"
                      )}>
                        {activeRemarkModal.percentageScore?.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Qualitative Remarks Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Qualitative Clinical Feedback</span>
                  </h5>
                  {activeRemarkModal.hasText && (
                    <Badge variant="outline" className="text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200">
                      Examiner Notes Recorded
                    </Badge>
                  )}
                </div>

                {activeRemarkModal.hasText ? (
                  <div className="relative p-4 pl-10 rounded-xl bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/50 dark:from-indigo-950/20 dark:via-card dark:to-slate-950/20 border border-indigo-200/70 dark:border-indigo-900/50 shadow-xs">
                    <Quote className="absolute top-3.5 left-3 w-5 h-5 text-indigo-300 dark:text-indigo-700" />
                    <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap italic">
                      &ldquo;{activeRemarkModal.text}&rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-border bg-muted/10 text-center space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      No written qualitative remarks were entered for this assessment.
                    </p>
                    <p className="text-[11px] text-muted-foreground/75">
                      This examiner evaluated the candidate directly via the procedural checklist step ratings below.
                    </p>
                  </div>
                )}
              </div>

              {/* Procedural Step Ratings Breakdown by this Examiner */}
              {steps.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Procedural Step Ratings Breakdown</span>
                    </h5>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Scale: 0 – {scaleMax}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/70 overflow-hidden shadow-2xs">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="w-10 text-center text-xs font-bold py-2">#</TableHead>
                          <TableHead className="text-xs font-bold py-2">Procedure Step</TableHead>
                          <TableHead className="w-24 text-center text-xs font-bold py-2">Score Awarded</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {steps.map((step) => {
                          const r = activeRemarkModal.ratings[step.id];
                          return (
                            <TableRow key={step.id} className="hover:bg-muted/20">
                              <TableCell className="text-center font-bold text-xs py-2.5 text-muted-foreground">
                                {step.stepNumber}
                              </TableCell>
                              <TableCell className="py-2.5">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs text-foreground leading-relaxed">
                                    {step.description}
                                  </span>
                                  {step.isKeyStep && (
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 text-[10px] font-semibold gap-1 flex-shrink-0 py-0"
                                    >
                                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-600" />
                                      Key Step
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center py-2.5">
                                {r !== undefined && r !== null ? (
                                  <span
                                    className={cn(
                                      "inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-black text-xs",
                                      r === 0
                                        ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 ring-1 ring-red-300 dark:ring-red-800"
                                        : r === scaleMax
                                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-800"
                                          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800"
                                    )}
                                  >
                                    {r}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground/50">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <DialogFooter className="px-6 py-3.5 border-t border-border/60 bg-muted/15 flex flex-col sm:flex-row items-center justify-between gap-3 -mx-0 -mb-0 rounded-b-2xl">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveRemarkModal(null);
                  setStepComparisonOpen(true);
                }}
                className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Open Peer Step Comparison</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setActiveRemarkModal(null)}
                className="cursor-pointer h-8 px-5"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
