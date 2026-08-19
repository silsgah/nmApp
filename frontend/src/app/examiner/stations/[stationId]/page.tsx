"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import {
  ArrowLeft, User, CheckCircle2, AlertCircle, Send,
  ChevronDown, ChevronUp, Info, Clock, Search, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ExaminerCopilot } from "@/components/examiner/examiner-copilot";

interface Candidate {
  assignmentId: string;
  candidateNumber: string;
  student: { id: string; name: string; email: string; staffId: string | null; programmeId: string; yearLevel: number | null };
  selectedTask: { id: string; name: string; maxScore: number; ratingScale: string; category: { id: string; name: string } | null; steps: { id: string; stepNumber: number; description: string; isKeyStep?: boolean }[] } | null;
  scorecard: {
    id: string; totalScore: number; percentageScore: number; isSubmitted: boolean; remarks: string;
  } | null;
  taskAttempts: TaskAttempt[];
}

interface TaskAttempt {
  id: string;
  sequence: number;
  status: "ACTIVE" | "REOPENED";
  task: Candidate["selectedTask"] extends infer T ? Exclude<T, null> : never;
  scorecards: NonNullable<Candidate["scorecard"]>[];
}

interface StationData {
  station: {
    id: string; stationCode: string;
  };
  candidates: Candidate[];
}

interface EligibleTask {
  id: string;
  name: string;
  maxScore: number;
  ratingScale: string;
  category: { id: string; name: string } | null;
  _count?: { steps: number };
}

function ScoreEntryCard({
  candidate, stationId, maxScore, examinerAssignmentId, ratingScale, steps, onNextCandidate,
  onInsertRemark, taskAttemptId,
}: {
  candidate: Candidate;
  stationId: string;
  maxScore: number;
  examinerAssignmentId: string;
  ratingScale: string;
  steps: { id: string; stepNumber: number; description: string; isKeyStep?: boolean }[];
  taskAttemptId: string;
  onNextCandidate?: () => void;
  // Registrar pattern: parent passes a fn that receives this card's insert handler
  onInsertRemark?: (registerFn: (text: string) => void) => void;
}) {
  const queryClient = useQueryClient();
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [isSubmittingDirect, setIsSubmittingDirect] = useState(false);

  // Layout presentation view state: "step" = wizard (default), "list" = full list
  const [viewMode, setViewMode] = useState<"step" | "list">("step");
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Parse initial remarks JSON
  let initialRatings: Record<string, number> = {};
  let initialTextRemarks = "";
  if (candidate.scorecard?.remarks) {
    try {
      const parsed = JSON.parse(candidate.scorecard.remarks);
      if (parsed && typeof parsed === "object" && parsed.ratings) {
        initialRatings = parsed.ratings;
        initialTextRemarks = parsed.text || "";
      } else {
        initialTextRemarks = candidate.scorecard.remarks;
      }
    } catch (e) {
      initialTextRemarks = candidate.scorecard.remarks;
    }
  }

  const [ratings, setRatings] = useState<Record<string, number>>(initialRatings);
  const [remarks, setRemarks] = useState(initialTextRemarks);

  // Expose insert handler for AI Copilot to paste feedback into this scorecard
  const handleInsertRemark = useCallback((text: string) => {
    setRemarks((prev) => (prev ? `${prev.trim()}\n\n${text}` : text));
    toast.success("AI feedback inserted into remarks!", { icon: "✨" });
  }, []);

  // Register this card's handler with the parent page whenever it mounts or candidate changes
  useEffect(() => {
    if (onInsertRemark) {
      onInsertRemark(handleInsertRemark);
    }
  }, [handleInsertRemark, onInsertRemark]);

  const safeSteps = Array.isArray(steps) ? steps : [];
  const totalScoreVal = safeSteps.reduce((sum, step) => sum + (ratings[step.id] ?? 0), 0);
  const percentage = maxScore > 0 ? Math.round((totalScoreVal / maxScore) * 100) : 0;
  const isSubmitted = candidate.scorecard?.isSubmitted;

  const answeredCount = safeSteps.filter(step => ratings[step.id] !== undefined).length;
  const isAllRated = safeSteps.length > 0 && answeredCount === safeSteps.length;

  const saveMutation = useMutation({
    mutationFn: () => api.post("/scorecards", {
      studentAssignmentId: candidate.assignmentId,
      examinerAssignmentId,
      taskAttemptId,
      totalScore: totalScoreVal,
      remarks: JSON.stringify({ ratings, text: remarks }),
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["station-candidates", stationId] });
      if (isSubmittingDirect) {
        submitMutation.mutate(res.data.id);
      } else {
        toast.success(`Progress saved for ${candidate.student.name}`);
      }
    },
    onError: () => {
      toast.error("Failed to save scorecard");
      setIsSubmittingDirect(false);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (scorecardId: string) => api.post(`/scorecards/${scorecardId}/submit`),
    onSuccess: () => {
      toast.success(`Scorecard submitted for ${candidate.student.name}!`);
      queryClient.invalidateQueries({ queryKey: ["station-candidates", stationId] });
      setConfirmSubmit(false);
      setIsSubmittingDirect(false);
    },
    onError: () => {
      toast.error("Failed to submit scorecard");
      setIsSubmittingDirect(false);
    },
  });

  const handleStepRate = (stepId: string, value: number) => {
    setRatings(prev => ({
      ...prev,
      [stepId]: value
    }));
    // Auto-advance wizard if in step mode and not on the last step
    if (viewMode === "step" && activeStepIndex < safeSteps.length - 1) {
      setTimeout(() => {
        setActiveStepIndex(prev => prev + 1);
      }, 220);
    }
  };

  const triggerSubmitFlow = () => {
    setIsSubmittingDirect(true);
    saveMutation.mutate();
  };

  const getPercentColor = (p: number) =>
    p >= 75 ? "text-emerald-600 font-bold" : p >= 50 ? "text-indigo-600 font-bold" : "text-red-500 font-bold";

  const scaleOptions = ratingScale === "SCALE_0_4" ? [
    { value: 0, label: "This step was omitted" },
    { value: 1, label: "The basic technique was not done well" },
    { value: 2, label: "The technique was performed correctly but with hesitation" },
    { value: 3, label: "The technique was performed correctly but without hesitation" },
    { value: 4, label: "The technique, speed and style are excellent" }
  ] : [
    { value: 0, label: "This step was omitted" },
    { value: 1, label: "The technique was performed correctly but with hesitation" },
    { value: 2, label: "The technique was performed correctly but without hesitation" }
  ];

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200 overflow-hidden shadow-sm bg-card border-border",
      isSubmitted && "bg-muted/10 border-border opacity-90",
    )}>
      {/* Header row (Static, clean description box) */}
      <div className="w-full flex items-center gap-4 p-5 text-left border-b border-border bg-card">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold font-mono text-foreground">
            Index No: {candidate.student.staffId || candidate.candidateNumber}
          </p>
          <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
            {candidate.student.name}
          </p>
          {candidate.scorecard && (
            <div className="flex items-center gap-3 mt-1.5">
              <span className={cn("text-sm", getPercentColor(candidate.scorecard.percentageScore))}>
                Score: {candidate.scorecard.totalScore}/{maxScore}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">({Math.round(candidate.scorecard.percentageScore)}%)</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isSubmitted ? (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 text-xs font-semibold px-2.5 py-1">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Submitted
            </Badge>
          ) : candidate.scorecard ? (
            <Badge variant="outline" className="text-indigo-600 bg-indigo-50/50 border-indigo-200 text-xs font-semibold px-2.5 py-1">Draft</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground bg-muted/50 border-border text-xs font-semibold px-2.5 py-1">Not started</Badge>
          )}
        </div>
      </div>

      {/* Submitted view summary */}
      {isSubmitted ? (
        <div className="p-6 bg-muted/5 space-y-4 text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Scoring Submitted</h3>
            <p className="text-sm text-muted-foreground">
              Grading for this candidate is finalized.
            </p>
          </div>
          <div className="max-w-md mx-auto bg-background rounded-xl p-5 border border-border space-y-3 text-left shadow-sm">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-muted-foreground font-medium">Total Score</span>
              <span className="text-lg font-bold text-foreground">{candidate.scorecard?.totalScore} / {maxScore}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-muted-foreground font-medium">Percentage</span>
              <span className="text-lg font-bold text-emerald-600">{Math.round(candidate.scorecard?.percentageScore ?? 0)}%</span>
            </div>
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Remarks</span>
              <p className="text-sm italic text-foreground bg-muted/40 p-2.5 rounded-lg border">
                {remarks || "No remarks entered"}
              </p>
            </div>
          </div>
          {onNextCandidate && (
            <div className="pt-4">
              <Button
                onClick={onNextCandidate}
                className="gradient-primary border-0 text-white font-bold px-6 py-2 shadow-sm cursor-pointer"
              >
                Grade Next Candidate →
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Grading Form (Step Wizard vs Full checklist) */
        <div className="bg-muted/5">
          {/* View toggle header */}
          <div className="px-6 py-3.5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* View Mode controls */}
            <div className="flex bg-background border border-border p-1 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setViewMode("step")}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer select-none",
                  viewMode === "step" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Step-by-Step
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer select-none",
                  viewMode === "list" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Full Checklist
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-bold bg-background text-foreground border-border">
                {answeredCount} of {safeSteps.length} steps marked
              </Badge>
            </div>
          </div>

          {/* Stepper Progress dots */}
          {viewMode === "step" && (
            <div className="px-6 py-3 bg-background border-b border-border overflow-x-auto flex gap-1 items-center">
              {safeSteps.map((step, idx) => {
                const isStepRated = ratings[step.id] !== undefined;
                const isActive = activeStepIndex === idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStepIndex(idx)}
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition-all cursor-pointer",
                      isActive
                        ? "bg-primary text-white border-primary ring-2 ring-primary/20"
                        : isStepRated
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-background text-muted-foreground border-border hover:bg-muted/40"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          )}

          {/* Stepper Wizard Active Card */}
          {viewMode === "step" ? (
            <div className="p-6 transition-all duration-200">
              {/* Step info */}
              {(() => {
                const step = safeSteps[activeStepIndex];
                if (!step) return null;
                const selectedValue = ratings[step.id];
                const isStepRated = selectedValue !== undefined;
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-sm font-bold text-primary uppercase tracking-wider">
                        Step {activeStepIndex + 1} of {safeSteps.length}
                      </h4>
                      {isStepRated && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-2 py-0.5">
                          Score: {selectedValue}
                        </Badge>
                      )}
                    </div>
                    <p className="text-base font-semibold text-foreground leading-relaxed">
                      {step.description}
                    </p>

                    {/* Radio ratings */}
                    <div className="grid grid-cols-1 gap-2 pt-2">
                      {scaleOptions.map((opt) => {
                        const isSelected = selectedValue === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleStepRate(step.id, opt.value)}
                            className={cn(
                              "flex items-center text-left gap-3 px-4 py-3 rounded-lg border text-sm font-semibold transition-all duration-150 cursor-pointer w-full select-none",
                              isSelected
                                ? "bg-primary/5 text-primary border-primary shadow-sm"
                                : "bg-background text-muted-foreground border-border hover:bg-muted/30 hover:text-foreground"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0",
                              isSelected ? "border-primary" : "border-muted-foreground/30"
                            )}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <span>
                              {opt.value} · {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Step Navigator controls */}
                    <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={activeStepIndex === 0}
                        onClick={() => setActiveStepIndex(p => Math.max(0, p - 1))}
                        className="cursor-pointer"
                      >
                        ← Previous
                      </Button>
                      <span className="text-xs text-muted-foreground font-semibold">
                        Progress: {safeSteps.length ? Math.round((answeredCount / safeSteps.length) * 100) : 0}%
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={activeStepIndex === safeSteps.length - 1}
                        onClick={() => setActiveStepIndex(p => Math.min(safeSteps.length - 1, p + 1))}
                        className="cursor-pointer"
                      >
                        Next →
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Full checklist view list */
            <div className="divide-y divide-border/80">
              {safeSteps.map((step, index) => {
                const selectedValue = ratings[step.id];
                const isStepRated = selectedValue !== undefined;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "p-6 transition-all duration-200",
                      isStepRated ? "border-l-4 border-l-primary bg-primary/[0.01]" : "border-l-4 border-l-transparent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">
                          Step {index + 1}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                      {isStepRated && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-2 py-0.5">
                          Score: {selectedValue}
                        </Badge>
                      )}
                    </div>

                    {/* Option list */}
                    <div className="grid grid-cols-1 gap-2">
                      {scaleOptions.map((opt) => {
                        const isSelected = selectedValue === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleStepRate(step.id, opt.value)}
                            className={cn(
                              "flex items-center text-left gap-3 px-4 py-3 rounded-lg border text-sm font-semibold transition-all duration-150 cursor-pointer w-full select-none",
                              isSelected
                                ? "bg-primary/5 text-primary border-primary shadow-sm"
                                : "bg-background text-muted-foreground border-border hover:bg-muted/30 hover:text-foreground"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0",
                              isSelected ? "border-primary" : "border-muted-foreground/30"
                            )}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <span>
                              {opt.value} · {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Aggregate Summary Block */}
          <div className="p-6 bg-muted/20 border-t border-border space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-background border rounded-xl p-4 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Calculated Score</span>
                <span className="text-3xl font-bold text-foreground mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {totalScoreVal} <span className="text-sm font-normal text-muted-foreground">/ {maxScore}</span>
                </span>
              </div>
              <div className="bg-background border rounded-xl p-4 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Performance Rating</span>
                <span className={cn("text-3xl mt-1", getPercentColor(percentage))} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {percentage}%
                </span>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider" htmlFor={`remarks-${candidate.student.id}`}>
                  Remarks
                </label>
                <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  AI Copilot can insert feedback here
                </span>
              </div>
              <Textarea
                id={`remarks-${candidate.student.id}`}
                placeholder="Write observations about the candidate's performance — or use AI Copilot to draft clinical feedback..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                className="bg-background resize-none border-border focus-visible:ring-1 transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSubmittingDirect(false);
                  saveMutation.mutate();
                }}
                disabled={answeredCount === 0 || saveMutation.isPending}
                id={`save-score-${candidate.student.id}`}
              >
                {saveMutation.isPending && !isSubmittingDirect ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                className="gradient-primary border-0 text-white hover:opacity-90"
                onClick={() => setConfirmSubmit(true)}
                disabled={!isAllRated || saveMutation.isPending || submitMutation.isPending}
                id={`submit-score-${candidate.student.id}`}
              >
                <Send className="w-3.5 h-3.5 mr-2" />
                {submitMutation.isPending || isSubmittingDirect ? "Submitting..." : "Submit Final Score"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm submit */}
      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Final Score</AlertDialogTitle>
            <AlertDialogDescription>
              You are submitting a final scorecard for <strong>{candidate.student.name}</strong>.
              <br />
              <br />
              Calculated Score: <strong>{totalScoreVal}/{maxScore} ({percentage}%)</strong>
              <br />
              <br />
              Once submitted, you will not be able to modify these marks without admin override.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmSubmit(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="gradient-primary border-0 text-white"
              onClick={triggerSubmitFlow}
            >
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ExaminerStationPage() {
  const queryClient = useQueryClient();
  const params = useParams();
  const searchParams = useSearchParams();
  const stationId = params.stationId as string;
  const { user } = useAuthStore();

  // Auto-select student from URL query param (from global search)
  const highlightStudentId = searchParams.get("studentId");

  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [pendingTaskId, setPendingTaskId] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  // Ref to route AI copilot insert into the currently active ScoreEntryCard's remarks
  const insertRemarkRef = useRef<((text: string) => void) | null>(null);

  const handleCopilotInsert = useCallback((text: string) => {
    if (insertRemarkRef.current) {
      insertRemarkRef.current(text);
    }
  }, []);

  const { data, isLoading } = useQuery<StationData>({
    queryKey: ["station-candidates", stationId],
    queryFn: () => api.get(`/scorecards/my-station/${stationId}`).then((r) => r.data),
    enabled: !!stationId,
  });

  const { data: myAssignments } = useQuery({
    queryKey: ["examiner-assignments", user?.id],
    queryFn: () => api.get(`/assignments/examiners?examinerId=${user?.id}`).then((r) => r.data),
    enabled: !!user?.id,
  });

  const examinerAssignment = myAssignments?.find(
    (a: { station: { id: string }; id: string }) => a.station.id === stationId
  );

  const candidatesList = data?.candidates ?? [];
  const submitted = candidatesList.filter((c) => c.taskAttempts.length > 0 && c.taskAttempts.every((attempt) => attempt.scorecards[0]?.isSubmitted)).length;
  const total = candidatesList.length;

  // Filter candidates by search term (index number or name)
  const filteredCandidates = useMemo(() => {
    if (!rosterSearch.trim()) return candidatesList;
    const term = rosterSearch.toLowerCase().trim();
    return candidatesList.filter((c) =>
      (c.student.staffId?.toLowerCase() || "").includes(term) ||
      c.student.name.toLowerCase().includes(term) ||
      c.candidateNumber.toLowerCase().includes(term)
    );
  }, [candidatesList, rosterSearch]);

  // Auto-select: if a studentId is in URL (from global search), select that candidate
  useEffect(() => {
    if (highlightStudentId && candidatesList.length > 0) {
      const match = candidatesList.find((c) => c.student.id === highlightStudentId);
      if (match) {
        setActiveAssignmentId(match.assignmentId);
        return;
      }
    }
  }, [candidatesList, activeAssignmentId, highlightStudentId]);

  const activeCandidate = candidatesList.find((c) => c.assignmentId === activeAssignmentId);

  const { data: eligibleTasks = [] } = useQuery<EligibleTask[]>({
    queryKey: ["eligible-tasks", activeCandidate?.student.programmeId, activeCandidate?.student.yearLevel],
    queryFn: () => api.get(`/tasks?programmeId=${activeCandidate?.student.programmeId}&yearLevel=${activeCandidate?.student.yearLevel}&isActive=true`).then((r) => r.data),
    enabled: !!activeCandidate,
  });
  const eligibleCategories = Array.from(new Map(
    eligibleTasks.filter((task) => task.category).map((task) => [task.category!.id, task.category!]),
  ).values());
  const activeCategoryId = eligibleCategories.some((category) => category.id === selectedCategoryId) ? selectedCategoryId : "";
  const categoryTasks = eligibleTasks.filter((task) => task.category?.id === activeCategoryId);
  const activePendingTaskId = categoryTasks.some((task) => task.id === pendingTaskId) ? pendingTaskId : "";

  const selectTaskMutation = useMutation({
    mutationFn: (taskId: string) => api.post(`/assignments/students/${activeCandidate?.assignmentId}/select-task`, { taskId }),
    onSuccess: () => {
      toast.success("Task selected and shared with all assigned examiners");
      queryClient.invalidateQueries({ queryKey: ["station-candidates", stationId] });
    },
    onError: (error: { response?: { data?: { error?: string } } }) => toast.error(error.response?.data?.error || "Unable to select task"),
  });

  const activeIndex = candidatesList.findIndex((c) => c.assignmentId === activeAssignmentId);
  const hasNextCandidate = activeIndex !== -1 && activeIndex < candidatesList.length - 1;
  const nextCandidateAssignmentId = hasNextCandidate ? candidatesList[activeIndex + 1].assignmentId : null;

  const handleNextCandidate = () => {
    if (nextCandidateAssignmentId) {
      setActiveAssignmentId(nextCandidateAssignmentId);
    }
  };

  const getCandidateInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/examiner/stations">
          <Button variant="outline" size="icon" className="w-8 h-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          {isLoading ? <Skeleton className="h-7 w-64" /> : (
            <>
              <div className="flex items-center gap-3">
                <div className="gradient-primary w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{data?.station.stationCode}</span>
                </div>
                <h1 className="page-title truncate">Station {data?.station.stationCode}</h1>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground pl-11">
                <span>Task selected per candidate</span>
                <span>·</span>
                <span className={cn(
                  "font-medium",
                  submitted === total && total > 0 ? "text-emerald-600" : "text-amber-600"
                )}>
                  {submitted}/{total} submitted
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!isLoading && total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Overall scoring progress</span>
            <span>{Math.round((submitted / total) * 100)}% complete</span>
          </div>
          <Progress value={(submitted / total) * 100} className="h-2" />
        </div>
      )}

      {!isLoading && candidatesList.length > 0 && (
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Step 1 — Select student</CardTitle>
            <CardDescription>
              The student&apos;s programme and level determine which categories and tasks are available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchableSelect
              value={activeAssignmentId ?? ""}
              onValueChange={(value) => {
                setActiveAssignmentId(value);
                setSelectedCategoryId("");
                setPendingTaskId("");
              }}
              options={candidatesList.map((candidate) => ({
                value: candidate.assignmentId,
                label: `${candidate.student.staffId || candidate.candidateNumber} — ${candidate.student.name}`,
              }))}
              placeholder="Select student by index number or name"
              searchPlaceholder="Search student..."
              emptyMessage="No assigned student found"
            />
          </CardContent>
        </Card>
      )}

      {/* Roster & Grading Panel Split Pane */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-3 hidden md:block md:col-span-1">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      ) : !candidatesList.length ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-14 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No candidates assigned to this station</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Mobile: Search + Stories-style Horizontal bubble selector */}
          <div className="md:hidden space-y-3">
            {/* Mobile search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search by index or name..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
              />
              {rosterSearch && (
                <button
                  onClick={() => setRosterSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-3.5 overflow-x-auto pb-3 border-b border-border scrollbar-none">
              {filteredCandidates.map((candidate) => {
                const isSelected = candidate.assignmentId === activeAssignmentId;
                const attemptScores = candidate.taskAttempts.flatMap((attempt) => attempt.scorecards);
                const isDone = candidate.taskAttempts.length > 0 && attemptScores.length === candidate.taskAttempts.length && attemptScores.every((scorecard) => scorecard.isSubmitted);
                const isDraft = attemptScores.some((scorecard) => !scorecard.isSubmitted);
                return (
                  <button
                    key={candidate.assignmentId}
                    onClick={() => setActiveAssignmentId(candidate.assignmentId)}
                    className="flex flex-col items-center flex-shrink-0 gap-1.5 focus:outline-none"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center relative font-bold text-xs border-2 transition-all cursor-pointer",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/10 text-primary"
                        : isDone
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : isDraft
                            ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                            : "border-border bg-background text-muted-foreground"
                    )}>
                      {getCandidateInitials(candidate.student.name)}
                      {/* Status dot */}
                      <div className={cn(
                        "w-3 h-3 rounded-full border border-background absolute bottom-0 right-0",
                        isDone ? "bg-emerald-500" : isDraft ? "bg-indigo-500" : "bg-muted-foreground/30"
                      )} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold font-mono max-w-[68px] truncate",
                      isSelected ? "text-primary font-bold" : "text-muted-foreground"
                    )}>
                      {candidate.student.staffId || "—"}
                    </span>
                  </button>
                );
              })}
              {filteredCandidates.length === 0 && rosterSearch && (
                <p className="text-xs text-muted-foreground py-2 px-1">No candidates match "{rosterSearch}"</p>
              )}
            </div>
          </div>

          {/* Desktop Left Roster Column */}
          <div className="hidden md:flex flex-col gap-2 md:col-span-1 max-h-[650px] overflow-y-auto pr-2 border-r border-border">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">Candidates Roster</h3>
            {/* Roster search */}
            <div className="relative mb-1 px-0.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search index / name..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="w-full pl-7 pr-7 py-1.5 text-[11px] rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                id="roster-search-input"
              />
              {rosterSearch && (
                <button
                  onClick={() => setRosterSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {filteredCandidates.length === 0 && rosterSearch ? (
              <div className="text-center py-6 px-2">
                <Search className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground/25" />
                <p className="text-[11px] text-muted-foreground">No match for "{rosterSearch}"</p>
              </div>
            ) : (
              filteredCandidates.map((candidate) => {
                const isSelected = candidate.assignmentId === activeAssignmentId;
                const attemptScores = candidate.taskAttempts.flatMap((attempt) => attempt.scorecards);
                const isDone = candidate.taskAttempts.length > 0 && attemptScores.length === candidate.taskAttempts.length && attemptScores.every((scorecard) => scorecard.isSubmitted);
                const isDraft = attemptScores.some((scorecard) => !scorecard.isSubmitted);
                return (
                  <button
                    key={candidate.assignmentId}
                    onClick={() => setActiveAssignmentId(candidate.assignmentId)}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all w-full cursor-pointer hover:bg-muted/30 select-none",
                      isSelected
                        ? "bg-primary/5 text-primary border-primary font-bold shadow-sm"
                        : "bg-background text-foreground border-border"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 font-mono",
                      isDone
                        ? "bg-emerald-100 text-emerald-700"
                        : isDraft
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {getCandidateInitials(candidate.student.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold font-mono text-foreground truncate">
                        {candidate.student.staffId || "—"}
                      </p>
                      <span className="text-[10px] font-medium text-muted-foreground block truncate mt-0.5">
                        {candidate.student.name}
                      </span>
                    </div>
                    {/* Small check badge */}
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : isDraft ? (
                      <Clock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {/* Desktop Right Detail Scoring Panel */}
          <div className="md:col-span-3">
            {activeCandidate ? (
                <div className="space-y-5">
                  {activeCandidate.taskAttempts.map((attempt) => {
                    const attemptCandidate = { ...activeCandidate, selectedTask: attempt.task, scorecard: attempt.scorecards[0] || null };
                    return <div className="space-y-3" key={attempt.id}>
                      <div className="rounded-xl border bg-muted/20 px-4 py-3">
                        <p className="text-xs font-semibold text-muted-foreground">Shared task attempt {attempt.sequence}</p>
                        <p className="font-bold">{attempt.task.name} {attempt.task.category && <Badge variant="outline" className="ml-2">{attempt.task.category.name}</Badge>}</p>
                      </div>
                      <ScoreEntryCard
                        candidate={attemptCandidate}
                        stationId={stationId}
                        taskAttemptId={attempt.id}
                        maxScore={attempt.task.maxScore}
                        examinerAssignmentId={examinerAssignment?.id ?? ""}
                        ratingScale={attempt.task.ratingScale}
                        steps={attempt.task.steps}
                        onNextCandidate={hasNextCandidate ? handleNextCandidate : undefined}
                        onInsertRemark={(fn) => { insertRemarkRef.current = fn; }}
                      />
                    </div>;
                  })}
                  {(activeCandidate.taskAttempts.length === 0 || activeCandidate.taskAttempts.every((attempt) => attempt.scorecards[0]?.isSubmitted)) && (
                <div className="rounded-xl border bg-card p-6 space-y-5">
                  <div>
                    <h2 className="text-lg font-bold">Choose the examination</h2>
                    <p className="text-sm text-muted-foreground">Categories and tasks below are filtered automatically using this student&apos;s programme and level.</p>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p><strong>Task policy:</strong> one Major task has full weight; two different Minor tasks have half weight each. Examiner scores are averaged per task, and the same task cannot be repeated by this student within the examination session.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Step 2 — Select category</Label>
                    <Select
                      value={activeCategoryId}
                      items={eligibleCategories.map((category) => ({ value: category.id, label: category.name }))}
                      onValueChange={(value) => { setSelectedCategoryId(value || ""); setPendingTaskId(""); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Medical, Nursing, Major, Minor, or another configured category" /></SelectTrigger>
                      <SelectContent>{eligibleCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {activeCategoryId && <div className="space-y-2">
                    <Label>Step 3 — Select task</Label>
                    <Select
                      value={activePendingTaskId}
                      items={categoryTasks.map((task) => ({ value: task.id, label: task.name }))}
                      onValueChange={(value) => setPendingTaskId(value || "")}
                    >
                      <SelectTrigger><SelectValue placeholder="Select an associated task" /></SelectTrigger>
                      <SelectContent>{categoryTasks.map((task) => <SelectItem key={task.id} value={task.id}>{task.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {activePendingTaskId && (() => {
                      const task = categoryTasks.find((item) => item.id === activePendingTaskId);
                      return task ? <p className="text-xs text-muted-foreground">{task._count?.steps ?? 0} checklist steps · maximum score {task.maxScore}</p> : null;
                    })()}
                    <Button className="w-full sm:w-auto" disabled={!activePendingTaskId || selectTaskMutation.isPending} onClick={() => selectTaskMutation.mutate(activePendingTaskId)}>
                      {selectTaskMutation.isPending ? "Opening scoring form…" : "Confirm task and begin scoring"}
                    </Button>
                  </div>}
                  {!eligibleTasks.length && <p className="text-sm text-amber-700">No active tasks are mapped to this candidate&apos;s programme and level.</p>}
                </div>
                  )}
                </div>
            ) : (
              <div className="rounded-xl border border-dashed p-14 text-center">
                <p className="text-muted-foreground">Select a student above to begin the examination.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Examiner Copilot — floats above all content */}
      <ExaminerCopilot
        stationContext={{
          stationCode: data?.station.stationCode,
          taskName: activeCandidate?.taskAttempts.at(-1)?.task.name,
          ratingScale: activeCandidate?.taskAttempts.at(-1)?.task.ratingScale === "SCALE_0_4" ? "0-4" : "0-2",
          maxScore: activeCandidate?.taskAttempts.at(-1)?.task.maxScore,
          candidateNumber: activeCandidate?.student?.staffId || activeCandidate?.candidateNumber,
        }}
        onInsertRemark={handleCopilotInsert}
      />
    </div>
  );
}
