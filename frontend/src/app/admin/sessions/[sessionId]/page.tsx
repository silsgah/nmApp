"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft, Settings2, Plus, Users, ClipboardList,
  CheckCircle2, Clock, PlayCircle, XCircle, BarChart3,
  ChevronRight, Layers, UserCheck, RefreshCw, AlertCircle, Calendar
  , ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Trash2, User } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusConfig = {
  DRAFT:     { label: "Draft",      color: "bg-muted text-muted-foreground",                           icon: Clock },
  ACTIVE:    { label: "Active",     color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",   icon: PlayCircle },
  MARKING:   { label: "Marking",    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: ClipboardList },
  COMPLETED: { label: "Completed",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled",  color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
};

function AddStationDialog({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.post("/stations", { sessionId, stationCode: code }),
    onSuccess: () => {
      toast.success("Station added");
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      onClose();
    },
    onError: () => toast.error("Failed to add station"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] flex flex-col rounded-2xl border border-border/80 shadow-2xl p-0 overflow-hidden">
        {/* Pinned Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border/40 bg-muted/10 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Add Examination Station</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Create a station. The task is selected for each candidate during examination.</DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto min-h-0">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Station Code *</Label>
            <Input id="station-code-input" placeholder="e.g. S01, Station 1, A" value={code} onChange={(e) => setCode(e.target.value)} className="bg-muted/20 border-border/60 focus:bg-background" />
          </div>
          <p className="rounded-lg border bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
            Examiners will first select one of the candidate&apos;s programme categories, then a task mapped to the candidate&apos;s programme and level.
          </p>
        </div>

        {/* Pinned Footer */}
        <div className="px-6 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="cursor-pointer">Cancel</Button>
          <Button
            size="sm"
            className="gradient-primary border-0 text-white hover:opacity-90 cursor-pointer px-5 shadow-sm"
            disabled={!code.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            id="submit-add-station-btn"
          >
            {mutation.isPending ? "Adding Station..." : "Add Station"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { ScheduleSessionDialog } from "@/components/admin/schedule-session-dialog";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const queryClient = useQueryClient();
  const [addStationOpen, setAddStationOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [noStationsDialogOpen, setNoStationsDialogOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}`).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ["session-stats", sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}/stats`).then((r) => r.data),
    refetchInterval: 15_000,
  });


  const transitionMutation = useMutation({
    mutationFn: (action: string) => api.post(`/sessions/${sessionId}/${action}`),
    onSuccess: (_, action) => {
      const labels: Record<string, string> = {
        activate: "Session activated",
        "start-marking": "Marking phase started",
        complete: "Session marked as complete",
      };
      toast.success(labels[action] ?? "Status updated");
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const resetExaminationsMutation = useMutation({
    mutationFn: () => api.post(`/sessions/${sessionId}/reset-examinations`, { reason: resetReason.trim(), confirmation: resetConfirmation }),
    onSuccess: (response) => {
      toast.success(response.data?.message || "Examination data cleared");
      setResetDialogOpen(false); setResetReason(""); setResetConfirmation("");
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session-stats", sessionId] });
    },
    onError: (error: any) => toast.error(error.response?.data?.error || "Unable to reset examination data"),
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!session) return <div className="p-8 text-muted-foreground">Session not found</div>;

  const StatusIcon = statusConfig[session.status as keyof typeof statusConfig]?.icon ?? Clock;
  const statusCfg = statusConfig[session.status as keyof typeof statusConfig];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Back nav */}
      <button
        onClick={() => router.push("/admin/sessions")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Sessions
      </button>

      {/* Session hero */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full", statusCfg?.color)}>
                <StatusIcon className="w-3 h-3" />
                {statusCfg?.label}
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {session.programme?.name}
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                Year {session.yearLevel}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {session.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {session.semester} · {session.academicYear}
            </p>
          </div>

          {/* Status transition buttons */}
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            {session.status === "DRAFT" && (
              <Button
                className="gradient-primary border-0 text-white hover:opacity-90"
                onClick={() => transitionMutation.mutate("activate")}
                disabled={transitionMutation.isPending}
              >
                <PlayCircle className="w-4 h-4 mr-2" /> Activate Session
              </Button>
            )}
            {session.status === "ACTIVE" && (
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white border-0"
                onClick={() => transitionMutation.mutate("start-marking")}
                disabled={transitionMutation.isPending}
              >
                <ClipboardList className="w-4 h-4 mr-2" /> Start Marking
              </Button>
            )}
            {session.status === "MARKING" && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                onClick={() => transitionMutation.mutate("complete")}
                disabled={transitionMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Complete
              </Button>
            )}
            {session.status === "COMPLETED" && (
              <Link href="/admin/results">
                <Button variant="outline" className="gap-2">
                  <BarChart3 className="w-4 h-4" /> View Results
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Config row */}
        {session.config && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
            <span>Pass mark: <strong className="text-foreground">{session.config.overallPassMark}%</strong></span>
            <span>Examiner count: <strong className="text-foreground">{session.config.examinerCount}</strong></span>
            <span>Aggregation: <strong className="text-foreground">{session.config.scoreAggregation}</strong></span>
          </div>
        )}
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Stations", value: stats.stationCount, icon: Layers },
            { label: "Students", value: stats.studentCount, icon: Users },
            { label: "Examiners", value: stats.examinerCount, icon: UserCheck },
            { label: "Completion", value: `${stats.completionRate}%`, icon: BarChart3 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="stat-card flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Marking progress */}
      {stats && stats.studentCount > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Marking completion</span>
            <span className="font-semibold text-foreground">{stats.submittedCount}/{stats.studentCount} scorecards submitted</span>
          </div>
          <Progress value={stats.completionRate} className="h-2" />
        </div>
      )}

      {stats && Object.values(stats.examinationRecords || {}).some((count) => Number(count) > 0) && (
        <Card className="border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400"><ShieldAlert className="h-4 w-4" /> Reset examination data</CardTitle>
            <CardDescription>This preserves the session setup, stations, candidates and examiners, but permanently clears all practical attempts, scorecards, computed results, Care Plan, Case Study and Obstetric examination records.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {stats.examinationRecords.taskAttempts} task attempts · {stats.examinationRecords.scorecards} submitted scorecards · {stats.examinationRecords.results} computed results · {stats.examinationRecords.carePlans} care plans · {stats.examinationRecords.caseStudies} case studies · {stats.examinationRecords.obstetric} obstetric
            </p>
            <Button variant="destructive" size="sm" onClick={() => setResetDialogOpen(true)}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Reset for fresh exams</Button>
          </CardContent>
        </Card>
      )}

      {/* Stations list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Stations ({session.stations?.length ?? 0})</h2>
            <p className="text-xs text-muted-foreground">The examiner selects an eligible task for each candidate</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!session.stations?.length) {
                  setNoStationsDialogOpen(true);
                } else {
                  setScheduleOpen(true);
                }
              }}
              disabled={session.status !== "DRAFT"}
              id="auto-assign-btn"
              title={session.status !== "DRAFT" ? "Scheduling is only allowed for draft sessions" : "Generate exam schedule for candidates and examiners"}
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-primary" /> Schedule candidates
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddStationOpen(true)}
              disabled={session.status !== "DRAFT"}
              id="add-station-btn"
              title={session.status !== "DRAFT" ? "Adding stations is only allowed for draft sessions" : "Create a new exam station"}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Station
            </Button>
          </div>
        </div>

        {!session.stations?.length ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center">
            <Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground/25" />
            <p className="font-medium text-muted-foreground">No stations yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Add stations while the session is in Draft status</p>
            {session.status === "DRAFT" && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setAddStationOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add First Station
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11 w-[120px]">Code</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Task</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Category</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Candidates</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right h-11">Max Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.stations.map((station: {
                  id: string;
                  stationCode: string;
                  task: { name: string; maxScore: number; category?: { name: string } } | null;
                  _count: { studentAssignments: number; examinerAssignments: number };
                }) => (
                  <TableRow
                    key={station.id}
                    onClick={() => setSelectedStation(station)}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    <TableCell className="px-6 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg gradient-primary text-white text-xs font-bold shadow-sm">
                        {station.stationCode}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-3.5">
                      <span className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                        {station.task?.name || "Selected during examination"}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {station.task?.category?.name ?? "Per candidate"}
                    </TableCell>
                    <TableCell className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        {station._count.studentAssignments} candidates
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-3.5 text-sm font-bold text-foreground text-right whitespace-nowrap">
                      {station.task?.maxScore ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add station dialog */}
      {addStationOpen && (
        <AddStationDialog
          sessionId={sessionId}
          onClose={() => setAddStationOpen(false)}
        />
      )}

      {scheduleOpen && (
        <ScheduleSessionDialog
          sessionId={sessionId}
          session={session}
          onClose={() => setScheduleOpen(false)}
        />
      )}

      {/* Manage station assignments dialog */}
      {selectedStation && (
        <ManageStationDialog
          station={selectedStation}
          onClose={() => {
            setSelectedStation(null);
            queryClient.invalidateQueries({ queryKey: ["session-stats", sessionId] });
          }}
        />
      )}

      {/* No Stations Warning Dialog */}
      <Dialog open={noStationsDialogOpen} onOpenChange={setNoStationsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-5 h-5 text-amber-600" /> No Stations Added Yet
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-muted-foreground">
              You cannot generate a schedule because no clinical exam stations have been added to this exam session yet. Please add at least one station before scheduling candidates and examiners.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button variant="outline" onClick={() => setNoStationsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gradient-primary text-white border-0"
              onClick={() => {
                setNoStationsDialogOpen(false);
                setAddStationOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add First Station
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><ShieldAlert className="h-5 w-5" /> Permanently reset examination data?</DialogTitle>
            <DialogDescription>This cannot be undone. An audit entry containing the administrator, reason and deleted record counts will be retained. The session will return to Active for fresh examinations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Reason for reset</Label><Input value={resetReason} onChange={(event) => setResetReason(event.target.value)} placeholder="Minimum 10 characters" /></div>
            <div className="space-y-1.5"><Label>Type the exact session name to confirm</Label><p className="rounded bg-muted px-2 py-1 text-xs font-semibold">{session.name}</p><Input value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} placeholder={session.name} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={resetReason.trim().length < 10 || resetConfirmation !== session.name || resetExaminationsMutation.isPending} onClick={() => resetExaminationsMutation.mutate()}>
              {resetExaminationsMutation.isPending ? "Resetting…" : "Permanently clear examination data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ManageStationDialog({
  station,
  onClose,
}: {
  station: {
    id: string;
    stationCode: string;
    task: { name: string; maxScore: number };
  };
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"examiners" | "students">("examiners");

  // Get examiners assigned to this station
  const { data: examinerAssignments, isLoading: loadingExs } = useQuery({
    queryKey: ["station-examiners", station.id],
    queryFn: () => api.get(`/assignments/examiners?stationId=${station.id}`).then((r) => r.data),
  });

  // Get students assigned to this station
  const { data: studentAssignments, isLoading: loadingSts } = useQuery({
    queryKey: ["station-students", station.id],
    queryFn: () => api.get(`/assignments/students?stationId=${station.id}`).then((r) => r.data),
  });

  // Get all examiners from user bank
  const { data: allExaminersData } = useQuery({
    queryKey: ["all-examiners"],
    queryFn: () => api.get("/users?role=EXAMINER&limit=200").then((r) => r.data),
  });

  // Get all students from user bank
  const { data: allStudentsData } = useQuery({
    queryKey: ["all-students"],
    queryFn: () => api.get("/users?role=STUDENT&limit=200").then((r) => r.data),
  });

  // Mutations for Assign/Delete
  const assignExaminer = useMutation({
    mutationFn: (examinerId: string) => api.post("/assignments/examiners", { examinerId, stationId: station.id }),
    onSuccess: () => {
      toast.success("Examiner assigned");
      queryClient.invalidateQueries({ queryKey: ["station-examiners", station.id] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
    onError: () => toast.error("Failed to assign examiner"),
  });

  const removeExaminer = useMutation({
    mutationFn: (id: string) => api.delete(`/assignments/examiners/${id}`),
    onSuccess: () => {
      toast.success("Examiner removed");
      queryClient.invalidateQueries({ queryKey: ["station-examiners", station.id] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });

  const assignStudent = useMutation({
    mutationFn: ({ studentId, candidateNumber }: { studentId: string; candidateNumber?: string }) =>
      api.post("/assignments/students", { studentId, stationId: station.id, candidateNumber }),
    onSuccess: () => {
      toast.success("Student assigned");
      queryClient.invalidateQueries({ queryKey: ["station-students", station.id] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
    onError: () => toast.error("Failed to assign student"),
  });

  const removeStudent = useMutation({
    mutationFn: (id: string) => api.delete(`/assignments/students/${id}`),
    onSuccess: () => {
      toast.success("Student removed");
      queryClient.invalidateQueries({ queryKey: ["station-students", station.id] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });

  const [selectedEx, setSelectedEx] = useState("");
  const [selectedSt, setSelectedSt] = useState("");
  const [candidateNo, setCandidateNo] = useState("");

  const examiners = allExaminersData?.data ?? [];
  const students = allStudentsData?.data ?? [];

  // Filter out already assigned examiners
  const availableExaminers = examiners.filter(
    (ex: any) => !examinerAssignments?.some((ea: any) => ea.examinerId === ex.id)
  );

  // Filter out already assigned students
  const availableStudents = students.filter(
    (st: any) => !studentAssignments?.some((sa: any) => sa.studentId === st.id)
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg gradient-primary text-white text-xs font-bold shadow-sm">
              {station.stationCode}
            </span>
            <span>Manage Station Assignments</span>
          </DialogTitle>
          <DialogDescription>
            {station.task ? `${station.task.name} (Max Score: ${station.task.maxScore})` : "Task selected per candidate during examination"}
          </DialogDescription>
        </DialogHeader>

        {/* Tab buttons */}
        <div className="flex border-b border-border mt-2">
          <button
            type="button"
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-colors",
              activeTab === "examiners"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("examiners")}
          >
            Examiners ({examinerAssignments?.length ?? 0})
          </button>
          <button
            type="button"
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-colors",
              activeTab === "students"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("students")}
          >
            Candidates ({studentAssignments?.length ?? 0})
          </button>
        </div>

        <div className="py-4 space-y-4">
          {activeTab === "examiners" ? (
            <div className="space-y-4">
              {/* Assign form */}
              <div className="flex gap-2 items-end bg-muted/30 p-3 rounded-lg border border-border">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="assign-examiner-select" className="text-xs">Assign New Examiner</Label>
                  <SearchableSelect
                    value={selectedEx}
                    onValueChange={setSelectedEx}
                    options={availableExaminers.map((ex: any) => ({
                      label: `${ex.name} ${ex.staffId ? `(${ex.staffId})` : ""}`,
                      value: ex.id,
                    }))}
                    placeholder="Choose examiner..."
                    searchPlaceholder="Search examiners..."
                  />
                </div>
                <Button
                  onClick={() => {
                    if (selectedEx) {
                      assignExaminer.mutate(selectedEx, {
                        onSuccess: () => setSelectedEx(""),
                      });
                    }
                  }}
                  disabled={!selectedEx || assignExaminer.isPending}
                  size="sm"
                  className="gradient-primary border-0 text-white h-10 px-4"
                >
                  Assign
                </Button>
              </div>

              {/* Assignment list */}
              {loadingExs ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !examinerAssignments?.length ? (
                <p className="text-center py-6 text-sm text-muted-foreground">No examiners assigned to this station yet.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {examinerAssignments.map((ea: any) => (
                    <div key={ea.id} className="flex justify-between items-center px-4 py-2.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/10 transition-all text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{ea.examiner.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{ea.examiner.staffId || "No Staff ID"}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 cursor-pointer w-8 h-8"
                        onClick={() => removeExaminer.mutate(ea.id)}
                        disabled={removeExaminer.isPending}
                        title="Remove Examiner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Assign form */}
              <div className="flex gap-2 items-end bg-muted/30 p-3 rounded-lg border border-border flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  <Label htmlFor="assign-student-select" className="text-xs">Assign Candidate</Label>
                  <SearchableSelect
                    value={selectedSt}
                    onValueChange={setSelectedSt}
                    options={availableStudents.map((st: any) => ({
                      label: `${st.name} ${st.staffId ? `(${st.staffId})` : `(${st.email})`}`,
                      value: st.id,
                    }))}
                    placeholder="Choose student..."
                    searchPlaceholder="Search candidates..."
                  />
                </div>
                <div className="w-full sm:w-36 space-y-1.5">
                  <Label htmlFor="candidate-no-input" className="text-xs">Candidate No. (Optional)</Label>
                  <Input
                    id="candidate-no-input"
                    className="h-10"
                    placeholder="e.g. C001"
                    value={candidateNo}
                    onChange={(e) => setCandidateNo(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => {
                    if (selectedSt) {
                      assignStudent.mutate(
                        { studentId: selectedSt, candidateNumber: candidateNo || undefined },
                        {
                          onSuccess: () => {
                            setSelectedSt("");
                            setCandidateNo("");
                          },
                        }
                      );
                    }
                  }}
                  disabled={!selectedSt || assignStudent.isPending}
                  size="sm"
                  className="gradient-primary border-0 text-white w-full sm:w-auto h-10 px-4"
                >
                  Assign
                </Button>
              </div>

              {/* Assignment list */}
              {loadingSts ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !studentAssignments?.length ? (
                <p className="text-center py-6 text-sm text-muted-foreground">No candidates assigned to this station yet.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {studentAssignments.map((sa: any) => (
                    <div key={sa.id} className="flex justify-between items-center px-4 py-2.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/10 transition-all text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{sa.student.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {sa.student.staffId ? `Index: ${sa.student.staffId}` : sa.student.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sa.candidateNumber && (
                          <Badge variant="outline" className="font-mono text-[10px] border-primary/20 bg-primary/5 text-primary">
                            No. {sa.candidateNumber}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 cursor-pointer w-8 h-8"
                          onClick={() => removeStudent.mutate(sa.id)}
                          disabled={removeStudent.isPending}
                          title="Remove Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
