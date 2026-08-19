"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Calendar, Plus, Search, Filter, MoreHorizontal,
  Play, CheckCircle, Archive, Pencil, BarChart3,
  AlertCircle, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PageLessonBanner } from "@/components/admin/page-lesson-banner";
import { format } from "date-fns";

interface ExamSession {
  id: string; name: string; semester: string; academicYear: string;
  status: string; startDate: string | null; endDate: string | null;
  yearLevel: number;
  programme: { id: string; name: string; fullName: string };
  config: { examinerCount: number; overallPassMark: number } | null;
  _count: { stations: number };
}

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  ACTIVE: { label: "Active", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800", dot: "bg-green-500" },
  MARKING: { label: "Marking", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800", dot: "bg-blue-500" },
  COMPLETED: { label: "Completed", className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800", dot: "bg-purple-500" },
  ARCHIVED: { label: "Archived", className: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground/50" },
};

export default function SessionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [actionSession, setActionSession] = useState<{ id: string; name: string; action: string } | null>(null);

  const { data: sessions, isLoading } = useQuery<ExamSession[]>({
    queryKey: ["sessions"],
    queryFn: () => api.get("/sessions").then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post(`/sessions/${id}/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session status updated");
      setActionSession(null);
    },
    onError: () => toast.error("Failed to update session"),
  });

  const filtered = sessions?.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.programme?.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const nextAction: Record<string, { label: string; action: string; icon: React.ElementType }> = {
    DRAFT: { label: "Activate", action: "activate", icon: Play },
    ACTIVE: { label: "Start Marking", action: "start-marking", icon: CheckCircle },
    MARKING: { label: "Complete", action: "complete", icon: Archive },
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Context-aware Page Lesson Banner */}
      <PageLessonBanner />
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Exam Sessions</h1>
          <p className="page-subtitle">Manage all practical examination sessions</p>
        </div>
        <Link href="/admin/sessions/new">
          <Button className="gradient-primary border-0 text-white shadow-md hover:opacity-90" id="create-session-btn">
            <Plus className="w-4 h-4 mr-2" /> New Session
          </Button>
        </Link>
      </div>

      {/* Summary pills */}
      {!isLoading && sessions && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusConfig).map(([status, cfg]) => {
            const count = sessions.filter((s) => s.status === status).length;
            if (count === 0) return null;
            return (
              <span
                key={status}
                className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border", cfg.className)}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                {count} {cfg.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="sessions-search"
          placeholder="Search sessions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Sessions grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No sessions found</p>
          <p className="text-sm mt-1">Create your first exam session to get started</p>
          <Link href="/admin/sessions/new">
            <Button variant="outline" className="mt-4">Create Session</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((session) => {
            const cfg = statusConfig[session.status];
            const next = nextAction[session.status];
            return (
              <Card key={session.id} className="shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                {/* Accent bar */}
                <div className={cn(
                  "absolute top-0 left-0 right-0 h-0.5",
                  session.status === "ACTIVE" ? "bg-green-500" :
                  session.status === "MARKING" ? "bg-blue-500" :
                  session.status === "COMPLETED" ? "bg-purple-500" : "bg-border"
                )} />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <CardTitle className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                        {session.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {session.programme?.fullName} · Year {session.yearLevel} · {session.academicYear}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="w-7 h-7 flex-shrink-0" id={`session-menu-${session.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          render={<Link href={`/admin/sessions/${session.id}`} className="flex items-center" />}
                        >
                          <Eye className="w-3.5 h-3.5 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          render={<Link href={`/admin/sessions/${session.id}/edit`} className="flex items-center" />}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          render={<Link href={`/admin/results?sessionId=${session.id}`} className="flex items-center" />}
                        >
                          <BarChart3 className="w-3.5 h-3.5 mr-2" /> Results
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Semester</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{session.semester}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stations</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{session._count?.stations ?? 0}</p>
                    </div>
                  </div>

                  {/* Config */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{session.config?.examinerCount ?? 3} examiners</span>
                    <span>·</span>
                    <span>{session.config?.overallPassMark ?? 50}% pass mark</span>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border", cfg.className)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot, session.status === "ACTIVE" && "animate-pulse")} />
                      {cfg.label}
                    </span>
                    {next && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        id={`${next.action}-btn-${session.id}`}
                        onClick={() => setActionSession({ id: session.id, name: session.name, action: next.action })}
                      >
                        <next.icon className="w-3 h-3 mr-1.5" />
                        {next.label}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={!!actionSession} onOpenChange={() => setActionSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to{" "}
              <strong>{actionSession?.action.replace("-", " ")}</strong>{" "}
              the session &ldquo;{actionSession?.name}&rdquo;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionSession && statusMutation.mutate({ id: actionSession.id, action: actionSession.action })}
              className="gradient-primary border-0 text-white"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
