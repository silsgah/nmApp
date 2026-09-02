"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import {
  ClipboardList, CheckCircle2, Clock, ChevronRight,
  Stethoscope, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StationAssignment {
  id: string;
  station: {
    id: string; stationCode: string;
    task?: { id: string; name: string; maxScore: number; ratingScale: string } | null;
    _count: { studentAssignments: number };
    session?: { id: string; name: string; status: string };
  };
  scorecards?: { id: string; isSubmitted: boolean }[];
}

export default function ExaminerDashboard() {
  const { user } = useAuthStore();

  const { data: assignments, isLoading } = useQuery<StationAssignment[]>({
    queryKey: ["examiner-assignments", user?.id],
    queryFn: () => api.get(`/assignments/examiners?examinerId=${user?.id}`).then((r) => r.data),
    enabled: !!user?.id,
  });

  const total = assignments?.length ?? 0;
  const totalCandidates = assignments?.reduce(
    (sum, a) => sum + (a.station._count?.studentAssignments ?? 0), 0
  ) ?? 0;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">
          Welcome, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="page-subtitle">
          {user?.staffId && <span className="font-mono text-xs">{user.staffId} · </span>}
          Examiner Portal — Review your assigned stations below
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Assigned Stations", value: isLoading ? "—" : total,
            icon: ClipboardList, color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
            sub: "practical tasks to examine",
          },
          {
            label: "Total Candidates", value: isLoading ? "—" : totalCandidates,
            icon: Stethoscope, color: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
            sub: "students assigned to your stations",
          },
          {
            label: "Pending Scores", value: isLoading ? "—" : totalCandidates,
            icon: Clock, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
            sub: "scorecards awaiting entry",
          },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : (
                  <p className="text-3xl font-bold mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              </div>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
                <Icon className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Assigned Stations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">My Assigned Stations</h2>
          <Link href="/examiner/stations">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              View all <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : !assignments || assignments.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium text-muted-foreground">No stations assigned yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              The administrator will assign you to examination stations.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.slice(0, 6).map((assignment) => {
              const candidates = assignment.station._count?.studentAssignments ?? 0;
              const scorecards = assignment.scorecards ?? [];
              const submittedCount = scorecards.filter((s: any) => s.isSubmitted).length;
              const draftCount = scorecards.filter((s: any) => !s.isSubmitted).length;

              const allDone = candidates > 0 && submittedCount === candidates;
              const someDone = submittedCount > 0 || draftCount > 0;
              const isSessionCompleted = assignment.station.session?.status === "COMPLETED";

              return (
                <Link
                  key={assignment.id}
                  href={`/examiner/stations/${assignment.station.id}`}
                  className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4 hover:bg-muted/40 hover:shadow-sm transition-all group"
                  id={`station-card-${assignment.station.id}`}
                >
                  {/* Station code badge */}
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white text-sm font-bold">
                      {assignment.station.stationCode}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {assignment.station.task?.name || `Station ${assignment.station.stationCode}`}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {candidates} candidate{candidates !== 1 ? "s" : ""}
                      </span>
                      <span className="text-muted-foreground/40 text-xs">·</span>
                      <span className="text-xs text-muted-foreground">
                        {assignment.station.task ? `Max score: ${assignment.station.task.maxScore}` : "Task selected per candidate"}
                      </span>
                      {assignment.station.task?.ratingScale && (
                        <span className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          assignment.station.task.ratingScale === "SCALE_0_4"
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                            : "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                        )}>
                          {assignment.station.task.ratingScale === "SCALE_0_4" ? "0–4 Scale" : "0–2 Scale"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isSessionCompleted ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Session Closed
                      </Badge>
                    ) : allDone ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                      </Badge>
                    ) : someDone ? (
                      <Badge variant="outline" className="text-amber-600 bg-amber-50/30 border-amber-300 text-xs">
                        <Clock className="w-3 h-3 mr-1" /> {submittedCount}/{candidates} done
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground bg-muted/30 border-border text-xs">
                        <Clock className="w-3 h-3 mr-1" /> Pending
                      </Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
