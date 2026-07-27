"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users, BookOpen, Calendar, BarChart3,
  TrendingUp, ClipboardCheck, AlertCircle,
  ChevronRight, Activity, GraduationCap
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { cn } from "@/lib/utils";

function StatCard({
  title, value, sub, icon: Icon, color, loading,
}: {
  title: string; value: string | number; sub: string;
  icon: React.ElementType; color: string; loading?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {value}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuthStore();

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get("/sessions").then((r) => r.data),
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users-count"],
    queryFn: () => api.get("/users?limit=1").then((r) => r.data),
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks-count"],
    queryFn: () => api.get("/tasks").then((r) => r.data),
  });

  const activeSessions = sessions?.filter(
    (s: { status: string }) => s.status === "ACTIVE" || s.status === "MARKING"
  ) ?? [];

  const recentSessions = sessions?.slice(0, 5) ?? [];

  const statusConfig: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
    ACTIVE: { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    MARKING: { label: "Marking", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    COMPLETED: { label: "Completed", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    ARCHIVED: { label: "Archived", className: "bg-muted text-muted-foreground" },
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
              {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="page-subtitle">
              Here&rsquo;s what&rsquo;s happening across your examination portal today
            </p>
          </div>
          <Link href="/admin/sessions/new">
            <Button className="gradient-primary border-0 text-white shadow-md hover:opacity-90" id="new-session-btn">
              <Calendar className="w-4 h-4 mr-2" />
              New Exam Session
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={usersLoading ? "—" : (users?.total ?? 0)}
          sub="Registered across all programmes"
          icon={GraduationCap}
          color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
          loading={usersLoading}
        />
        <StatCard
          title="Exam Sessions"
          value={sessionsLoading ? "—" : (sessions?.length ?? 0)}
          sub={`${activeSessions.length} currently active`}
          icon={Calendar}
          color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
          loading={sessionsLoading}
        />
        <StatCard
          title="Tasks in Bank"
          value={tasksLoading ? "—" : (tasks?.length ?? 0)}
          sub="RGN, RM & Health Assessment"
          icon={BookOpen}
          color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
          loading={tasksLoading}
        />
        <StatCard
          title="Active Examiners"
          value={usersLoading ? "—" : "—"}
          sub="Across all active sessions"
          icon={ClipboardCheck}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          loading={usersLoading}
        />
      </div>

      {/* Active sessions alert */}
      {activeSessions.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
          <Activity className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              {activeSessions.length} active examination session{activeSessions.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
              {activeSessions.map((s: { name: string }) => s.name).join(", ")}
            </p>
          </div>
          <Link href="/admin/sessions">
            <Button variant="outline" size="sm" className="text-green-700 border-green-300 hover:bg-green-100 text-xs">
              View
            </Button>
          </Link>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Sessions */}
        <Card className="xl:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Exam Sessions</CardTitle>
              <CardDescription className="text-xs mt-0.5">Latest examination sessions across all programmes</CardDescription>
            </div>
            <Link href="/admin/sessions">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" id="view-sessions-btn">
                View all <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {sessionsLoading ? (
              <div className="px-6 py-4 space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="px-6 py-10 text-center text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No exam sessions yet.</p>
                <Link href="/admin/sessions/new">
                  <Button variant="outline" size="sm" className="mt-3">Create your first session</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentSessions.map((session: {
                  id: string; name: string; status: string;
                  programme: { name: string }; academicYear: string; semester: string;
                  yearLevel: number;
                  _count: { stations: number }
                }) => (
                  <Link
                    href={`/admin/sessions/${session.id}`}
                    key={session.id}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/50 transition-colors group"
                    id={`session-row-${session.id}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{session.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {session.programme?.name} · Year {session.yearLevel} · {session.semester} · {session.academicYear}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {session._count?.stations ?? 0} stations
                      </span>
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        statusConfig[session.status]?.className
                      )}>
                        {statusConfig[session.status]?.label}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              <CardDescription className="text-xs">Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/admin/sessions/new", icon: Calendar, label: "Create Exam Session", color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
                { href: "/admin/users?role=STUDENT", icon: Users, label: "Manage Students", color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/30" },
                { href: "/admin/tasks/new", icon: BookOpen, label: "Add Task to Bank", color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30" },
                { href: "/admin/results", icon: BarChart3, label: "View & Publish Results", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
              ].map(({ href, icon: Icon, label, color, bg }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors group"
                  id={`quick-${label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bg)}>
                    <Icon className={cn("w-4 h-4", color)} />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* System Info */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">System</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "RGN Programme", value: "Active" },
                { label: "RM Programme", value: "Active" },
                { label: "Health Assessment", value: "Independent" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {value}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
