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
  Sparkles,
  Star,
  Info,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
}: StationReconciliationPanelProps) {
  const [stepComparisonOpen, setStepComparisonOpen] = useState(false);
  const [activeRemarkModal, setActiveRemarkModal] = useState<{
    examinerName: string;
    text: string;
  } | null>(null);

  const isBlindMasked = summary?.isBlindMasked ?? true;
  const submittedItems = reconciliation.filter((r) => r.isSubmitted);
  const unmaskedSubmittedItems = reconciliation.filter(
    (r) => r.isSubmitted && !r.isMasked && r.totalScore !== null
  );

  // Parse step ratings from each unmasked examiner's remarks JSON
  const examinerStepRatings = unmaskedSubmittedItems.map((ex) => {
    let ratings: Record<string, number> = {};
    let text = "";
    if (ex.remarks) {
      try {
        const parsed = JSON.parse(ex.remarks);
        if (parsed && typeof parsed === "object" && parsed.ratings) {
          ratings = parsed.ratings;
          text = parsed.text || "";
        } else {
          text = ex.remarks;
        }
      } catch {
        text = ex.remarks;
      }
    }
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
                  To protect objectivity and prevent scoring bias, peer examiners' numerical marks remain confidential until you finalize and submit your scorecard for this candidate.
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
                  There is a significant scoring spread across assigned examiners for this candidate. Station examiners should review the step breakdown together to reach consensus.
                </p>
              </div>
            </div>
          ) : null}

          {/* Examiners Roster Table */}
          <div className="rounded-xl border border-border/70 overflow-hidden shadow-2xs">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[35%] text-xs font-bold">Assigned Examiner</TableHead>
                  <TableHead className="w-[20%] text-xs font-bold">Status</TableHead>
                  <TableHead className="w-[20%] text-xs font-bold">Score Awarded</TableHead>
                  <TableHead className="w-[15%] text-xs font-bold text-right">Percentage</TableHead>
                  <TableHead className="w-[10%] text-xs font-bold text-center">Feedback</TableHead>
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

                  // Extract text remarks if any
                  let parsedRemarkText = "";
                  if (examiner.remarks) {
                    try {
                      const parsed = JSON.parse(examiner.remarks);
                      parsedRemarkText = parsed?.text || examiner.remarks;
                    } catch {
                      parsedRemarkText = examiner.remarks;
                    }
                  }

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

                      <TableCell className="py-3 text-center">
                        {!examiner.isMasked && parsedRemarkText ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setActiveRemarkModal({
                                examinerName: examiner.examinerName,
                                text: parsedRemarkText,
                              })
                            }
                            className="h-7 w-7 p-0 cursor-pointer hover:bg-muted"
                            title="View Examiner Remarks"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-primary" />
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
          {!isBlindMasked && unmaskedSubmittedItems.length >= 2 && steps.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Examine step-by-step scoring differences across all {unmaskedSubmittedItems.length} examiners.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStepComparisonOpen(true)}
                className="h-8 text-xs font-semibold gap-1.5 cursor-pointer border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Compare Step Ratings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step-by-Step Itemized Comparison Dialog */}
      <Dialog open={stepComparisonOpen} onOpenChange={setStepComparisonOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-background">
          <DialogHeader className="px-6 py-4 border-b border-border/60 bg-muted/15">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Step-by-Step Examiner Ratings Comparison
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Candidate: <strong>{candidateName}</strong> ({candidateNumber}) · Task: <strong>{taskName}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            <div className="rounded-xl border border-border/70 overflow-hidden shadow-2xs">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                    <TableHead className="text-xs font-bold">Procedure Step</TableHead>
                    {examinerStepRatings.map((ex) => (
                      <TableHead
                        key={ex.examinerId}
                        className="text-center text-xs font-bold whitespace-nowrap px-3"
                      >
                        <div className="flex flex-col items-center">
                          <span>{ex.examinerName.split(" ")[0]}</span>
                          <span className="text-[10px] font-normal text-muted-foreground font-mono">
                            {ex.isSelf ? "(You)" : ex.staffId || ""}
                          </span>
                        </div>
                      </TableHead>
                    ))}
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
                        <TableCell className="text-center font-bold text-xs py-3 text-muted-foreground">
                          {step.stepNumber}
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex items-start gap-2">
                            <span className="text-xs sm:text-sm text-foreground leading-relaxed">
                              {step.description}
                            </span>
                            {step.isKeyStep && (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 text-[10px] font-semibold gap-1 flex-shrink-0"
                              >
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-600" />
                                Key Step
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {examinerStepRatings.map((ex) => {
                          const r = ex.ratings[step.id];
                          return (
                            <TableCell
                              key={ex.examinerId}
                              className="text-center py-3 font-mono font-bold text-xs sm:text-sm"
                            >
                              {r !== undefined ? (
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded",
                                    r === 0
                                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-black"
                                      : "bg-muted text-foreground"
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
                              className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 text-[10px] font-semibold"
                            >
                              Agreement
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 text-[10px] font-semibold"
                            >
                              Diff ({stepGap} pts)
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="px-6 py-3 border-t border-border/60 bg-muted/15 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Tip: Steps with rating differences are highlighted in amber for rapid reconciliation.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStepComparisonOpen(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remark Popup Dialog */}
      {activeRemarkModal && (
        <Dialog open onOpenChange={() => setActiveRemarkModal(null)}>
          <DialogContent className="max-w-md rounded-2xl border border-border/80 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>Remarks by {activeRemarkModal.examinerName}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Clinical feedback recorded for this candidate's performance.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {activeRemarkModal.text}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveRemarkModal(null)}
                className="cursor-pointer"
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
