"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, User, ChevronRight, CheckCircle2, Clock,
  AlertCircle, ArrowRight, Hash
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StationAssignment {
  id: string;
  station: {
    id: string;
    stationCode: string;
    task?: { id: string; name: string; maxScore: number; ratingScale: string } | null;
    _count: { studentAssignments: number };
    session?: { id: string; name: string; status: string };
  };
  scorecards?: { id: string; isSubmitted: boolean }[];
}

interface StationCandidate {
  assignmentId: string;
  candidateNumber: string;
  student: { id: string; name: string; email: string; staffId: string | null };
  selectedTask?: { id: string; name: string; maxScore: number } | null;
  taskAttempts?: Array<{ task: { id: string; name: string; maxScore: number } }>;
  scorecard: {
    id: string; totalScore: number; percentageScore: number; isSubmitted: boolean; remarks: string;
  } | null;
}

interface StationData {
  station: {
    id: string;
    stationCode: string;
    task?: { id: string; name: string; maxScore: number; ratingScale: string } | null;
  };
  candidates: StationCandidate[];
}

// Flattened search result type
interface StudentSearchResult {
  studentId: string;
  studentName: string;
  indexNumber: string | null;
  stationId: string;
  stationCode: string;
  taskName: string;
  maxScore: number;
  assignmentId: string;
  candidateNumber: string;
  scorecard: StationCandidate["scorecard"];
  sessionName: string;
}

export default function FindStudentPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");

  // 1. Fetch all examiner's station assignments
  const { data: assignments, isLoading: loadingAssignments } = useQuery<StationAssignment[]>({
    queryKey: ["examiner-assignments", user?.id],
    queryFn: () => api.get(`/assignments/examiners?examinerId=${user?.id}`).then((r) => r.data),
    enabled: !!user?.id,
  });

  // 2. Fetch candidates for each assigned station
  const stationIds = assignments?.map((a) => a.station.id) ?? [];

  const { data: allStationData, isLoading: loadingCandidates } = useQuery<StationData[]>({
    queryKey: ["all-station-candidates", stationIds.join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        stationIds.map((sid) =>
          api.get(`/scorecards/my-station/${sid}`).then((r) => r.data)
        )
      );
      return results;
    },
    enabled: stationIds.length > 0,
  });

  // 3. Flatten into searchable list
  const allStudents: StudentSearchResult[] = useMemo(() => {
    if (!allStationData || !assignments) return [];
    return allStationData.flatMap((sd, idx) => {
      const assignment = assignments[idx];
      return sd.candidates.map((c) => {
        const candidateTask = c.taskAttempts?.[0]?.task ?? c.selectedTask ?? sd.station.task;
        return {
          studentId: c.student.id,
          studentName: c.student.name,
          indexNumber: c.student.staffId,
          stationId: sd.station.id,
          stationCode: sd.station.stationCode,
          taskName: candidateTask?.name ?? "Task selected per candidate",
          maxScore: candidateTask?.maxScore ?? 0,
          assignmentId: c.assignmentId,
          candidateNumber: c.candidateNumber,
          scorecard: c.scorecard,
          sessionName: assignment?.station?.session?.name ?? "",
        };
      });
    });
  }, [allStationData, assignments]);

  // 4. Filter by search term
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return allStudents;
    const term = search.toLowerCase().trim();
    return allStudents.filter(
      (s) =>
        (s.indexNumber?.toLowerCase() || "").includes(term) ||
        s.studentName.toLowerCase().includes(term) ||
        s.candidateNumber.toLowerCase().includes(term) ||
        s.stationCode.toLowerCase().includes(term) ||
        s.taskName.toLowerCase().includes(term)
    );
  }, [allStudents, search]);

  // Group by student for a cleaner view
  const groupedByStudent = useMemo(() => {
    const map = new Map<string, StudentSearchResult[]>();
    for (const s of filteredStudents) {
      const key = s.studentId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [filteredStudents]);

  const isLoading = loadingAssignments || loadingCandidates;

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getScoreColor = (p: number) =>
    p >= 75 ? "text-emerald-600" : p >= 50 ? "text-indigo-600" : "text-red-500";

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-sm">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h1 className="page-title text-xl font-bold tracking-tight text-foreground">
              Find Student
            </h1>
            <p className="page-subtitle text-xs text-muted-foreground mt-0.5">
              Search across all your assigned stations by student index number or name
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
        <Input
          placeholder="Type student index number or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 text-sm border-border bg-background shadow-sm focus-visible:ring-1 focus-visible:ring-primary/30"
          id="global-student-search"
          autoFocus
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-xs font-medium">Clear</span>
          </button>
        )}
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {allStudents.length} total candidate entries across {stationIds.length} station{stationIds.length !== 1 ? "s" : ""}
          </span>
          {search && (
            <span className="font-semibold text-foreground">
              {filteredStudents.length} result{filteredStudents.length !== 1 ? "s" : ""} found
            </span>
          )}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !search.trim() ? (
        /* Empty state — prompt to search */
        <div className="rounded-xl border border-dashed bg-muted/20 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-indigo-400/50" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Search for a student
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Enter a student index number (e.g. <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border">NMC/RGN/24/001</span>) or name to find them across all your assigned stations.
          </p>
        </div>
      ) : groupedByStudent.length === 0 ? (
        /* No results */
        <div className="rounded-xl border border-dashed bg-muted/20 p-14 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/25" />
          <p className="font-medium text-muted-foreground">
            No students matching &ldquo;{search}&rdquo;
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Try a different index number or name. Only students assigned to your stations will appear.
          </p>
        </div>
      ) : (
        /* Results grouped by student */
        <div className="space-y-4">
          {groupedByStudent.map(([studentId, entries]) => {
            const first = entries[0];
            return (
              <div
                key={studentId}
                className="rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Student header */}
                <div className="flex items-center gap-4 px-5 py-4 bg-muted/20 border-b border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                    {getInitials(first.studentName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {first.studentName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Hash className="w-3 h-3 text-muted-foreground/50" />
                      <span className="text-xs font-mono font-semibold text-muted-foreground">
                        {first.indexNumber || "No index"}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold text-muted-foreground bg-background border-border">
                    {entries.length} station{entries.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {/* Station rows */}
                <div className="divide-y divide-border/60">
                  {entries.map((entry) => {
                    const isSubmitted = entry.scorecard?.isSubmitted;
                    const isDraft = entry.scorecard && !entry.scorecard.isSubmitted;

                    return (
                      <Link
                        key={`${entry.stationId}-${entry.assignmentId}`}
                        href={`/examiner/stations/${entry.stationId}?studentId=${entry.studentId}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                      >
                        {/* Station code */}
                        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="text-white text-xs font-bold">
                            {entry.stationCode}
                          </span>
                        </div>

                        {/* Station details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {entry.taskName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>Max: {entry.maxScore}</span>
                            {entry.sessionName && (
                              <>
                                <span className="text-muted-foreground/30">·</span>
                                <span className="truncate max-w-[160px]">{entry.sessionName}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Score / Status */}
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          {isSubmitted ? (
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className={cn("text-xs font-bold", getScoreColor(entry.scorecard!.percentageScore))}>
                                  {entry.scorecard!.totalScore}/{entry.maxScore}
                                </span>
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  ({Math.round(entry.scorecard!.percentageScore)}%)
                                </span>
                              </div>
                              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-0 text-[10px] font-semibold px-2 py-0.5">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                              </Badge>
                            </div>
                          ) : isDraft ? (
                            <Badge variant="outline" className="text-indigo-600 bg-indigo-50/50 border-indigo-200 text-xs font-semibold px-2 py-0.5">
                              <Clock className="w-3 h-3 mr-1" /> Draft
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground bg-muted/30 border-border text-xs font-semibold px-2 py-0.5">
                              Not graded
                            </Badge>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
