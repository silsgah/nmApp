"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import {
  FileSpreadsheet, Search, RefreshCw, Filter, CheckCircle2,
  Clock, Users, Award, BookOpen, Download, RotateCcw, Trash2,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AssessmentMatrixRecord {
  assignmentId: string;
  candidateNumber: string;
  student: {
    id: string;
    name: string;
    email: string;
    staffId: string | null;
  };
  session: {
    id: string;
    name: string;
    programme: {
      id: string;
      name: string;
      fullName: string;
    };
  };
  station: {
    id: string;
    stationCode: string;
    task: {
      id: string;
      name: string;
      maxScore: number;
    };
  };
  assignedExaminers: Array<{
    id: string;
    name: string;
    staffId: string | null;
  }>;
  scorecard: {
    id: string;
    totalScore: number;
    maxPossibleScore: number;
    percentageScore: number;
    isSubmitted: boolean;
    submittedAt: string | null;
    examinerName: string | null;
  } | null;
}

export default function AssessmentMatrixPage() {
  const queryClient = useQueryClient();
  const [selectedProgramme, setSelectedProgramme] = useState<string>("ALL");
  const [selectedSession, setSelectedSession] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "PENDING">("ALL");
  const [search, setSearch] = useState<string>("");

  // Modal dialog states for resetting / deleting scorecards
  const [resetTarget, setResetTarget] = useState<AssessmentMatrixRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssessmentMatrixRecord | null>(null);

  // Fetch Programmes
  const { data: programmes } = useQuery({
    queryKey: ["programmes"],
    queryFn: () => api.get("/programmes").then((r) => r.data),
  });

  // Fetch Sessions
  const { data: sessions } = useQuery<any[]>({
    queryKey: ["sessions"],
    queryFn: () => api.get("/sessions?activeOnly=true").then((r) => r.data),
  });

  // Fetch Assessment Matrix
  const { data: records, isLoading, refetch } = useQuery<AssessmentMatrixRecord[]>({
    queryKey: ["assessment-matrix", selectedSession, selectedProgramme],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSession !== "ALL") params.append("sessionId", selectedSession);
      if (selectedProgramme !== "ALL") params.append("programmeId", selectedProgramme);
      return api.get(`/scorecards/assessment-matrix?${params.toString()}`).then((r) => r.data);
    },
  });

  // Mutation: Reset (unsubmit) scorecard
  const resetMutation = useMutation({
    mutationFn: (scorecardId: string) => api.post(`/scorecards/${scorecardId}/unsubmit`),
    onSuccess: () => {
      toast.success("Assessment reset to Pending! Examiner can now re-assess candidate.", { icon: "🔄" });
      setResetTarget(null);
      queryClient.invalidateQueries({ queryKey: ["assessment-matrix"] });
    },
    onError: (err: any) => {
      toast.error("Failed to reset assessment: " + (err.response?.data?.error || err.message));
    },
  });

  // Mutation: Delete scorecard permanently
  const deleteMutation = useMutation({
    mutationFn: (scorecardId: string) => api.delete(`/scorecards/${scorecardId}`),
    onSuccess: () => {
      toast.success("Scorecard permanently deleted! Candidate station restored to fresh state.", { icon: "🗑️" });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["assessment-matrix"] });
    },
    onError: (err: any) => {
      toast.error("Failed to delete assessment: " + (err.response?.data?.error || err.message));
    },
  });

  // Filter records
  const filteredRecords = records?.filter((r) => {
    // Programme filter
    if (selectedProgramme !== "ALL" && r.session.programme.id !== selectedProgramme) {
      return false;
    }
    // Status filter
    const isDone = r.scorecard?.isSubmitted ?? false;
    if (statusFilter === "COMPLETED" && !isDone) return false;
    if (statusFilter === "PENDING" && isDone) return false;

    // Text Search
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const studentName = r.student.name.toLowerCase();
    const studentIndex = (r.student.staffId || "").toLowerCase();
    const taskName = r.station.task.name.toLowerCase();
    const stationCode = r.station.stationCode.toLowerCase();
    const examinerNames = r.assignedExaminers.map((e) => e.name.toLowerCase()).join(" ");

    return (
      studentName.includes(query) ||
      studentIndex.includes(query) ||
      taskName.includes(query) ||
      stationCode.includes(query) ||
      examinerNames.includes(query)
    );
  }) ?? [];

  // Summary Metrics
  const totalCount = filteredRecords.length;
  const completedCount = filteredRecords.filter((r) => r.scorecard?.isSubmitted).length;
  const pendingCount = totalCount - completedCount;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredRecords.length) return;
    const headers = [
      "Student Name",
      "Index Number",
      "Programme",
      "Session",
      "Station Code",
      "Task Name",
      "Assigned Examiner(s)",
      "Assessment Status",
      "Marks Obtained",
      "Max Marks",
      "Percentage (%)",
      "Assessing Examiner",
      "Submitted Date"
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.student.name}"`,
      `"${r.student.staffId || ""}"`,
      `"${r.session.programme.name}"`,
      `"${r.session.name}"`,
      `"${r.station.stationCode}"`,
      `"${r.station.task.name.replace(/"/g, '""')}"`,
      `"${r.assignedExaminers.map((e) => e.name).join("; ")}"`,
      `"${r.scorecard?.isSubmitted ? "Finished / Assessed" : "Pending"}"`,
      r.scorecard?.isSubmitted ? r.scorecard.totalScore : "",
      r.station.task.maxScore,
      r.scorecard?.isSubmitted ? Math.round(r.scorecard.percentageScore) : "",
      `"${r.scorecard?.examinerName || ""}"`,
      r.scorecard?.submittedAt ? new Date(r.scorecard.submittedAt).toLocaleDateString("en-GB") : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `assessment_matrix_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-sm">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="page-title text-xl font-bold tracking-tight text-foreground">Assessment Matrix & Progress Tracker</h1>
            <p className="page-subtitle text-xs text-muted-foreground mt-0.5">
              Monitor student assignments, examiner status, marks obtained, and manage assessment resets per programme
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 px-3 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={!filteredRecords.length}
            className="gradient-primary border-0 text-white shadow-md hover:opacity-90 h-9 px-4 cursor-pointer"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Station Assignments</p>
              <h3 className="text-xl font-bold text-foreground mt-0.5">{totalCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assessed / Completed</p>
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{completedCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pending Assessment</p>
              <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{pendingCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 flex-shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground">Completion Rate</p>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-xl font-bold text-foreground">{completionPercentage}%</h3>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-4 rounded-xl border border-border/60 shadow-sm">
        <div className="flex flex-wrap gap-2.5 items-center flex-1">
          {/* Programme Filter */}
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <select
              value={selectedProgramme}
              onChange={(e) => setSelectedProgramme(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="ALL">All Programmes</option>
              {programmes?.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.fullName})
                </option>
              ))}
            </select>
          </div>

          {/* Session Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer max-w-[220px]"
            >
              <option value="ALL">All Sessions</option>
              {sessions?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/40">
            {(["ALL", "COMPLETED", "PENDING"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  statusFilter === st
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {st === "ALL" ? "All Status" : st === "COMPLETED" ? "Finished" : "Pending"}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search student, index, task or examiner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Main Matrix Data Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider h-11">
                Student & Index No.
              </TableHead>
              <TableHead className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider h-11">
                Programme
              </TableHead>
              <TableHead className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider h-11">
                Assigned Station & Task
              </TableHead>
              <TableHead className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider h-11">
                Assigned Examiner(s)
              </TableHead>
              <TableHead className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider h-11">
                Assessment Status
              </TableHead>
              <TableHead className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right h-11">
                Marks Obtained
              </TableHead>
              <TableHead className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right h-11">
                Admin Control
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i} className="hover:bg-muted/5">
                  <TableCell className="px-5 py-4"><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell className="px-5 py-4"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="px-5 py-4"><Skeleton className="h-4 w-44" /></TableCell>
                  <TableCell className="px-5 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="px-5 py-4"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell className="px-5 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="px-5 py-4 text-right"><Skeleton className="h-8 w-20 ml-auto rounded-lg" /></TableCell>
                </TableRow>
              ))
            ) : filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-muted-foreground font-semibold text-sm">No assessment matrix records found</p>
                  <p className="text-xs text-muted-foreground/75 mt-1">
                    Try adjusting your programme, session, or status filters.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((r) => {
                const isSubmitted = r.scorecard?.isSubmitted ?? false;
                return (
                  <TableRow key={r.assignmentId} className="hover:bg-muted/20 transition-colors">
                    {/* Student & Index Number */}
                    <TableCell className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 font-mono">
                          {getInitials(r.student.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{r.student.name}</p>
                          <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 bg-muted text-muted-foreground border-border mt-0.5">
                            Index: {r.student.staffId || "Not Set"}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>

                    {/* Programme */}
                    <TableCell className="px-5 py-3.5 whitespace-nowrap">
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 text-[10px] font-bold">
                        {r.session.programme.name}
                      </Badge>
                    </TableCell>

                    {/* Assigned Station & Task */}
                    <TableCell className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded flex-shrink-0 font-mono">
                          {r.station.stationCode}
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate max-w-[240px]">
                          {r.station.task.name}
                        </span>
                      </div>
                    </TableCell>

                    {/* Assigned Examiner(s) */}
                    <TableCell className="px-5 py-3.5 whitespace-nowrap text-xs text-muted-foreground">
                      {r.assignedExaminers.length > 0 ? (
                        <div className="space-y-0.5">
                          {r.assignedExaminers.map((ex) => (
                            <p key={ex.id} className="font-medium text-foreground text-xs">
                              {ex.name} {ex.staffId ? <span className="text-[10px] font-mono text-muted-foreground">({ex.staffId})</span> : null}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <span className="italic text-muted-foreground/60">Unassigned</span>
                      )}
                    </TableCell>

                    {/* Assessment Status */}
                    <TableCell className="px-5 py-3.5 whitespace-nowrap">
                      {isSubmitted ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-bold gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Assessed / Finished
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold gap-1">
                          <Clock className="w-3 h-3" /> Pending Assessment
                        </Badge>
                      )}
                    </TableCell>

                    {/* Marks Obtained */}
                    <TableCell className="px-5 py-3.5 text-right whitespace-nowrap font-mono">
                      {isSubmitted && r.scorecard ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-foreground">
                            {r.scorecard.totalScore} / {r.station.task.maxScore}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            ({Math.round(r.scorecard.percentageScore)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 font-sans italic">—</span>
                      )}
                    </TableCell>

                    {/* Admin Control (Reset / Delete) */}
                    <TableCell className="px-5 py-3.5 text-right whitespace-nowrap">
                      {r.scorecard ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {isSubmitted && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setResetTarget(r)}
                              className="h-7 text-[11px] font-medium border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800 cursor-pointer"
                              title="Reset assessment status back to Pending"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Reset
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(r)}
                            className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                            title="Delete scorecard permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Modal Dialog: Reset Assessment ── */}
      {resetTarget && (
        <Dialog open onOpenChange={() => setResetTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <RotateCcw className="w-5 h-5" /> Reset Candidate Assessment?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                This will unsubmit the scorecard for <strong>{resetTarget.student.name}</strong> (Index: {resetTarget.student.staffId || "N/A"}) at Station <strong>{resetTarget.station.stationCode} ({resetTarget.station.task.name})</strong> and revert their status back to <strong>Pending Assessment</strong> so an examiner can re-assess them.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-semibold">Current Marks: {resetTarget.scorecard?.totalScore} / {resetTarget.station.task.maxScore} ({Math.round(resetTarget.scorecard?.percentageScore ?? 0)}%)</p>
              <p className="mt-0.5 text-[11px] opacity-80">Assessed by: {resetTarget.scorecard?.examinerName || "Examiner"}</p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button variant="outline" size="sm" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white border-0"
                disabled={resetMutation.isPending}
                onClick={() => {
                  if (resetTarget.scorecard?.id) {
                    resetMutation.mutate(resetTarget.scorecard.id);
                  }
                }}
              >
                {resetMutation.isPending ? "Resetting..." : "Yes, Reset Assessment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal Dialog: Delete Scorecard ── */}
      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" /> Delete Scorecard Permanently?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Are you sure you want to permanently delete the scorecard for <strong>{deleteTarget.student.name}</strong> at Station <strong>{deleteTarget.station.stationCode} ({deleteTarget.station.task.name})</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (deleteTarget.scorecard?.id) {
                    deleteMutation.mutate(deleteTarget.scorecard.id);
                  }
                }}
              >
                {deleteMutation.isPending ? "Deleting..." : "Permanently Delete Scorecard"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
