"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarCheck,
  Users,
  GraduationCap,
  Stethoscope,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  Info,
  ShieldCheck,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  Scale,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduleCandidate {
  id: string;
  name: string;
  staffId: string | null;
  yearLevel: number | null;
  programmeId?: string | null;
  reason?: string | null;
}

interface ScheduleExaminer {
  id: string;
  name: string;
  staffId: string | null;
}

interface ScheduleOptions {
  students: ScheduleCandidate[];
  excludedStudents: ScheduleCandidate[];
  examiners: ScheduleExaminer[];
  eligibleTaskCount: number;
  examinerCount: number;
  stationCount: number;
}

interface ScheduleSessionDialogProps {
  sessionId: string;
  session?: {
    id: string;
    name: string;
    programme?: { name: string; code: string };
    yearLevel?: number | null;
    status: string;
    config?: { examinerCount?: number };
    stations?: any[];
  };
  onClose: () => void;
}

export function ScheduleSessionDialog({
  sessionId,
  session,
  onClose,
}: ScheduleSessionDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"candidates" | "examiners" | "preview">("candidates");

  // Selection state
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [examinerIds, setExaminerIds] = useState<string[]>([]);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);

  // Search & Filter state
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateFilter, setCandidateFilter] = useState<"all" | "selected" | "unselected">("all");
  const [examinerSearch, setExaminerSearch] = useState("");
  const [showExcluded, setShowExcluded] = useState(false);

  // Fetch scheduling options from backend
  const { data: options, isLoading } = useQuery<ScheduleOptions>({
    queryKey: ["schedule-options", sessionId],
    queryFn: () =>
      api.get(`/sessions/${sessionId}/schedule-options`).then((res) => res.data),
  });

  // Auto-initialize with all eligible candidates & examiners selected by default
  useEffect(() => {
    if (options && !hasInitializedSelection) {
      if (options.students?.length) {
        setStudentIds(options.students.map((s) => s.id));
      }
      if (options.examiners?.length) {
        setExaminerIds(options.examiners.map((e) => e.id));
      }
      setHasInitializedSelection(true);
    }
  }, [options, hasInitializedSelection]);

  // Mutation to execute scheduling
  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/sessions/${sessionId}/auto-assign`, { studentIds, examinerIds }),
    onSuccess: (response) => {
      toast.success(
        response.data?.message || "Examination schedule generated successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session-stats", sessionId] });
      onClose();
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || "Failed to create examination schedule");
    },
  });

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    if (!options?.students) return [];
    return options.students.filter((student) => {
      const q = candidateSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        student.name.toLowerCase().includes(q) ||
        (student.staffId && student.staffId.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const isSelected = studentIds.includes(student.id);
      if (candidateFilter === "selected") return isSelected;
      if (candidateFilter === "unselected") return !isSelected;
      return true;
    });
  }, [options?.students, candidateSearch, candidateFilter, studentIds]);

  // Filtered examiners
  const filteredExaminers = useMemo(() => {
    if (!options?.examiners) return [];
    return options.examiners.filter((examiner) => {
      const q = examinerSearch.trim().toLowerCase();
      return (
        !q ||
        examiner.name.toLowerCase().includes(q) ||
        (examiner.staffId && examiner.staffId.toLowerCase().includes(q))
      );
    });
  }, [options?.examiners, examinerSearch]);

  const toggleStudent = (id: string) => {
    setStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleExaminer = (id: string) => {
    setExaminerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllCandidates = () => {
    if (!options?.students) return;
    const allIds = options.students.map((s) => s.id);
    setStudentIds(allIds);
  };

  const clearAllCandidates = () => {
    setStudentIds([]);
  };

  const selectAllExaminers = () => {
    if (!options?.examiners) return;
    setExaminerIds(options.examiners.map((e) => e.id));
  };

  const clearAllExaminers = () => {
    setExaminerIds([]);
  };

  const stationCount = options?.stationCount ?? session?.stations?.length ?? 0;
  const requiredExaminerPerStation =
    options?.examinerCount ?? session?.config?.examinerCount ?? 3;

  const totalCandidatesAvailable = options?.students?.length ?? 0;
  const totalExaminersAvailable = options?.examiners?.length ?? 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-5xl h-[92vh] max-h-[92vh] flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-background">
        {/* Pinned Header */}
        <div className="px-6 py-4.5 border-b border-border/60 bg-muted/15 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 shadow-xs">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                  <span>Generate Examination Schedule</span>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/25 text-[11px] font-semibold">
                    Automated Roster
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Assign candidates and station examiners with sequential candidate codes and balanced round-robin examiner rotation.
                </DialogDescription>
              </div>
            </div>

            {/* Session Metadata Badges */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border/70 text-xs font-medium text-muted-foreground shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>
                  <strong className="text-foreground">{stationCount}</strong> Stations
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border/70 text-xs font-medium text-muted-foreground shadow-2xs">
                <Scale className="w-3.5 h-3.5 text-primary" />
                <span>
                  <strong className="text-foreground">{requiredExaminerPerStation}</strong> Examiners/Station
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border/70 text-xs font-medium text-muted-foreground shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>
                  <strong className="text-foreground">{options?.eligibleTaskCount ?? 0}</strong> Tasks Mapped
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 mt-4 pt-1 border-t border-border/40">
            <button
              type="button"
              onClick={() => setActiveTab("candidates")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "candidates"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <GraduationCap className="w-4 h-4" />
              <span>1. Eligible Candidates</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                  activeTab === "candidates"
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {studentIds.length} / {totalCandidatesAvailable}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("examiners")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "examiners"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <Stethoscope className="w-4 h-4" />
              <span>2. Station Examiners</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                  activeTab === "examiners"
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {examinerIds.length} / {totalExaminersAvailable}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "preview"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span>3. Preview & Rules</span>
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-background/50">
          {isLoading ? (
            <div className="space-y-4 py-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-64 rounded-lg" />
                <Skeleton className="h-9 w-32 rounded-lg" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: CANDIDATES */}
              {activeTab === "candidates" && (
                <div className="space-y-5">
                  {/* Action & Filter Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/70 shadow-xs">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search candidate name or index number..."
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                        className="pl-9 bg-background/80 h-9 text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center rounded-lg border border-border/80 p-0.5 bg-muted/30">
                        <button
                          type="button"
                          onClick={() => setCandidateFilter("all")}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                            candidateFilter === "all"
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          All ({options?.students?.length ?? 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCandidateFilter("selected")}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                            candidateFilter === "selected"
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Selected ({studentIds.length})
                        </button>
                      </div>

                      <div className="h-5 w-px bg-border/60 mx-1" />

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllCandidates}
                        className="h-8 text-xs font-semibold cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5 mr-1 text-primary" />
                        Select All
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllCandidates}
                        className="h-8 text-xs font-semibold cursor-pointer text-muted-foreground hover:text-destructive"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Candidates List Grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                      <span>
                        Showing <strong>{filteredCandidates.length}</strong> of{" "}
                        {options?.students?.length ?? 0} eligible candidates
                      </span>
                      <span className="font-medium text-foreground">
                        {studentIds.length} candidate{studentIds.length === 1 ? "" : "s"} will be scheduled
                      </span>
                    </div>

                    {filteredCandidates.length === 0 ? (
                      <div className="p-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/10">
                        <GraduationCap className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                        <p className="text-sm font-semibold text-foreground">No matching candidates found</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {candidateSearch
                            ? "Try adjusting your search query or clear filters."
                            : "No candidates have an exact programme and year level match for this session."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {filteredCandidates.map((student, index) => {
                          const isSelected = studentIds.includes(student.id);
                          const initials = student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);

                          return (
                            <div
                              key={student.id}
                              onClick={() => toggleStudent(student.id)}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
                                isSelected
                                  ? "bg-primary/5 border-primary/40 shadow-2xs ring-1 ring-primary/20"
                                  : "bg-card border-border/70 hover:border-border hover:bg-muted/20"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors",
                                    isSelected
                                      ? "bg-primary text-primary-foreground"
                                      : "border border-border/80 bg-background"
                                  )}
                                >
                                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>

                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                                  {initials}
                                </div>

                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                                    {student.name}
                                  </p>
                                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                    <span className="font-mono bg-muted/60 px-1.5 py-0.2 rounded text-[10px] text-foreground font-semibold">
                                      {student.staffId || "No Index #"}
                                    </span>
                                    {student.yearLevel && (
                                      <span>Year {student.yearLevel}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-semibold flex-shrink-0 ml-2",
                                  isSelected
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "bg-muted/50 text-muted-foreground border-border/60"
                                )}
                              >
                                {isSelected ? "Scheduled" : "Excluded"}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Excluded Candidates Drawer */}
                  {!!options?.excludedStudents?.length && (
                    <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/40 p-4 transition-all">
                      <div
                        onClick={() => setShowExcluded(!showExcluded)}
                        className="flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                            Ineligible Candidates in Programme ({options.excludedStudents.length})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-amber-800 dark:text-amber-400 font-medium">
                          <span>{showExcluded ? "Hide list" : "View reasons"}</span>
                          {showExcluded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>

                      {showExcluded && (
                        <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/30 space-y-2">
                          <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mb-2">
                            These candidates are registered under this programme but cannot be scheduled due to specific validation rules:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {options.excludedStudents.map((student) => (
                              <div
                                key={student.id}
                                className="p-2.5 rounded-lg bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 text-xs"
                              >
                                <p className="font-bold text-amber-950 dark:text-amber-200">
                                  {student.name}{" "}
                                  <span className="font-mono font-normal text-[10px] text-amber-800 dark:text-amber-400">
                                    ({student.staffId || "No Index"})
                                  </span>
                                </p>
                                <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5">
                                  Reason: {student.reason || "Eligibility rule check failed"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EXAMINERS */}
              {activeTab === "examiners" && (
                <div className="space-y-5">
                  {/* Coverage Health Indicator */}
                  <div
                    className={cn(
                      "p-4 rounded-xl border flex items-start gap-3",
                      examinerIds.length >= requiredExaminerPerStation
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300"
                        : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300"
                    )}
                  >
                    {examinerIds.length >= requiredExaminerPerStation ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="text-xs leading-relaxed">
                      <p className="font-bold">
                        Station Examiner Allocation: {examinerIds.length} Examiner(s) Selected for {stationCount} Station(s)
                      </p>
                      <p className="mt-0.5 opacity-90">
                        {examinerIds.length >= requiredExaminerPerStation
                          ? `Optimal pool coverage. The system will automatically rotate ${examinerIds.length} examiner(s) round-robin across all ${stationCount} station(s) with ${requiredExaminerPerStation} independent examiners per station.`
                          : `Advisory: You have selected ${examinerIds.length} examiner(s), but this session requires ${requiredExaminerPerStation} examiners per station. Examiners will be assigned up to available numbers.`}
                      </p>
                    </div>
                  </div>

                  {/* Action & Filter Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/70 shadow-xs">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search examiner name or staff ID..."
                        value={examinerSearch}
                        onChange={(e) => setExaminerSearch(e.target.value)}
                        className="pl-9 bg-background/80 h-9 text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllExaminers}
                        className="h-8 text-xs font-semibold cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5 mr-1 text-primary" />
                        Select All ({options?.examiners?.length ?? 0})
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllExaminers}
                        className="h-8 text-xs font-semibold cursor-pointer text-muted-foreground hover:text-destructive"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Examiners Grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                      <span>
                        Showing <strong>{filteredExaminers.length}</strong> of{" "}
                        {options?.examiners?.length ?? 0} available clinical examiners
                      </span>
                      <span className="font-medium text-foreground">
                        {examinerIds.length} examiner{examinerIds.length === 1 ? "" : "s"} assigned to rotation
                      </span>
                    </div>

                    {filteredExaminers.length === 0 ? (
                      <div className="p-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/10">
                        <Stethoscope className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                        <p className="text-sm font-semibold text-foreground">No examiners found</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {examinerSearch
                            ? "Try adjusting your search query."
                            : "No active examiners found mapped to this programme."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {filteredExaminers.map((examiner) => {
                          const isSelected = examinerIds.includes(examiner.id);
                          const initials = examiner.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);

                          return (
                            <div
                              key={examiner.id}
                              onClick={() => toggleExaminer(examiner.id)}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
                                isSelected
                                  ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-400/50 shadow-2xs ring-1 ring-indigo-400/20"
                                  : "bg-card border-border/70 hover:border-border hover:bg-muted/20"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors",
                                    isSelected
                                      ? "bg-indigo-600 text-white"
                                      : "border border-border/80 bg-background"
                                  )}
                                >
                                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>

                                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                                  {initials}
                                </div>

                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                                    {examiner.name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                    {examiner.staffId ? `Staff ID: ${examiner.staffId}` : "Clinical Examiner"}
                                  </p>
                                </div>
                              </div>

                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-semibold flex-shrink-0 ml-2",
                                  isSelected
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200"
                                    : "bg-muted/50 text-muted-foreground border-border/60"
                                )}
                              >
                                {isSelected ? "Included" : "Excluded"}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PREVIEW & RULES */}
              {activeTab === "preview" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs">
                      <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                        <GraduationCap className="w-4 h-4" />
                        <span>Candidates</span>
                      </div>
                      <p className="text-2xl font-black text-foreground mt-2">
                        {studentIds.length}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Will be assigned sequential IDs (C001–C{String(studentIds.length).padStart(3, "0")})
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                        <Stethoscope className="w-4 h-4" />
                        <span>Examiners</span>
                      </div>
                      <p className="text-2xl font-black text-foreground mt-2">
                        {examinerIds.length}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Assigned round-robin ({requiredExaminerPerStation} per station)
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        <Building2 className="w-4 h-4" />
                        <span>Clinical Stations</span>
                      </div>
                      <p className="text-2xl font-black text-foreground mt-2">
                        {stationCount}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Active assessment stations ready for examination
                      </p>
                    </div>
                  </div>

                  {/* Scheduling Policy Breakdown */}
                  <div className="p-4.5 rounded-xl border border-border/80 bg-muted/20 space-y-3 text-xs leading-relaxed">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      <span>Scheduling Rules & Execution Standard</span>
                    </h4>
                    <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                      <li>
                        <strong className="text-foreground">Clean Slate Overwrite:</strong> Any existing draft candidate and examiner assignments for this session will be safely replaced with this new verified roster.
                      </li>
                      <li>
                        <strong className="text-foreground">Candidate Identifiers:</strong> Each candidate receives an official examination candidate code formatted as{" "}
                        <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-foreground">
                          [IndexNumber]-C001
                        </code>
                        .
                      </li>
                      <li>
                        <strong className="text-foreground">Multi-Examiner Rotation:</strong> Examiners are balanced across stations without duplicate examiner assignments on any individual station.
                      </li>
                      <li>
                        <strong className="text-foreground">Session Status:</strong> Scheduling is executed while the session is in <span className="font-semibold text-foreground">DRAFT</span> status. After scheduling, you can activate the session for live examiner marking.
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pinned Footer */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {studentIds.length} candidate{studentIds.length === 1 ? "" : "s"} & {examinerIds.length} examiner{examinerIds.length === 1 ? "" : "s"} selected
            </span>
            {stationCount > 0 && (
              <span className="hidden sm:inline">
                · Ready for {stationCount} station{stationCount === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="cursor-pointer"
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gradient-primary border-0 text-white hover:opacity-95 cursor-pointer px-6 shadow-md font-semibold text-xs h-9"
              disabled={
                !studentIds.length ||
                !examinerIds.length ||
                stationCount === 0 ||
                mutation.isPending
              }
              onClick={() => mutation.mutate()}
              id="confirm-generate-schedule-btn"
            >
              {mutation.isPending ? (
                <>Generating Schedule...</>
              ) : (
                <>
                  <CalendarCheck className="w-4 h-4 mr-1.5" />
                  Schedule {studentIds.length} Candidate{studentIds.length === 1 ? "" : "s"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
