"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import { useState } from "react";
import {
  ClipboardList, ChevronRight, CheckCircle2, Clock, AlertCircle, FolderArchive
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function ExaminerStationsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["examiner-assignments", user?.id],
    queryFn: () => api.get(`/assignments/examiners?examinerId=${user?.id}`).then((r) => r.data),
    enabled: !!user?.id,
  });

  const assignmentsList = assignments ?? [];

  // Group stations into Active vs Completed/Archived
  const activeAssignments = assignmentsList.filter((assignment: any) => {
    const candidates = assignment.station._count?.studentAssignments ?? 0;
    const submittedCount = assignment.scorecards?.filter((s: any) => s.isSubmitted).length ?? 0;
    const allDone = candidates > 0 && submittedCount === candidates;
    const isSessionCompleted = assignment.station.session?.status === "COMPLETED";

    return !allDone && !isSessionCompleted;
  });

  const archivedAssignments = assignmentsList.filter((assignment: any) => {
    const candidates = assignment.station._count?.studentAssignments ?? 0;
    const submittedCount = assignment.scorecards?.filter((s: any) => s.isSubmitted).length ?? 0;
    const allDone = candidates > 0 && submittedCount === candidates;
    const isSessionCompleted = assignment.station.session?.status === "COMPLETED";

    return allDone || isSessionCompleted;
  });

  const total = assignmentsList.length;
  // Fully completed assignments count
  const completedCount = assignmentsList.filter((assignment: any) => {
    const candidates = assignment.station._count?.studentAssignments ?? 0;
    const submittedCount = assignment.scorecards?.filter((s: any) => s.isSubmitted).length ?? 0;
    return candidates > 0 && submittedCount === candidates;
  }).length;

  const currentList = activeTab === "active" ? activeAssignments : archivedAssignments;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="page-header">
        <h1 className="page-title">My Stations</h1>
        <p className="page-subtitle">All practical stations assigned to you</p>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overall completion progress</span>
            <span className="font-semibold text-foreground">
              {completedCount}/{total} stations fully scored
            </span>
          </div>
          <Progress value={total > 0 ? (completedCount / total) * 100 : 0} className="h-2" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("active")}
          className={cn(
            "pb-3 text-sm font-semibold px-4 transition-all relative cursor-pointer select-none",
            activeTab === "active"
              ? "text-primary border-b-2 border-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Active Stations ({activeAssignments.length})
        </button>
        <button
          onClick={() => setActiveTab("archived")}
          className={cn(
            "pb-3 text-sm font-semibold px-4 transition-all relative cursor-pointer select-none",
            activeTab === "archived"
              ? "text-primary border-b-2 border-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Completed / Archived ({archivedAssignments.length})
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : !currentList.length ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-14 text-center">
          {activeTab === "active" ? (
            <>
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500/40" />
              <p className="font-medium text-muted-foreground">No active grading pending!</p>
            </>
          ) : (
            <>
              <FolderArchive className="w-10 h-10 mx-auto mb-3 text-muted-foreground/25" />
              <p className="font-medium text-muted-foreground">No archived/completed stations yet</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((assignment: any) => {
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
                id={`station-list-${assignment.station.id}`}
              >
                {/* Code badge */}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-colors",
                  allDone || isSessionCompleted ? "bg-emerald-500" : "gradient-primary"
                )}>
                  <span className="text-white text-sm font-bold">
                    {assignment.station.stationCode}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">
                      Station {assignment.station.stationCode}
                    </p>
                    {assignment.station.session?.name && (
                      <span className="text-[10px] text-muted-foreground font-medium bg-muted border border-border px-1.5 py-0.5 rounded truncate max-w-[200px]">
                        {assignment.station.session.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-muted-foreground">
                    <span>{candidates} candidate{candidates !== 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span>Task selected per candidate</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
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
  );
}
