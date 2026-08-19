"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import {
  ClipboardList, BarChart3, Calendar, GraduationCap,
  ChevronRight, Clock, AlertCircle, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function StudentDashboard() {
  const { user } = useAuthStore();

  const { data: myAssignments, isLoading: assignLoading } = useQuery({
    queryKey: ["student-assignments", user?.id],
    queryFn: () => api.get(`/assignments/students?studentId=${user?.id}`).then((r) => r.data),
    enabled: !!user?.id,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["active-sessions"],
    queryFn: () => api.get("/sessions?status=ACTIVE").then((r) => r.data),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title text-xl sm:text-2xl font-bold">Welcome, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="page-subtitle text-xs sm:text-sm">
          {user?.programme?.fullName} · Student Portal
        </p>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Main Exam Stations) - Takes 2 cols on large screens */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border border-border">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm sm:text-base font-semibold">My Assessment Schedule</CardTitle>
              <CardDescription className="text-xs">
                Clinical assessment stations assigned to you for this session.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {assignLoading ? (
                <div className="px-6 py-4 space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                </div>
              ) : !myAssignments?.length ? (
                <div className="px-6 py-12 text-center">
                  <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/35" />
                  <p className="text-sm font-semibold text-foreground">No stations assigned yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Your practical rotation schedule will appear here once assignments are published by the administrator.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {myAssignments.map((assignment: {
                    id: string; candidateNumber: string;
                    selectedTask?: { id: string; name: string } | null;
                    station: { id: string; stationCode: string; task: { id: string; name: string } | null }
                  }) => (
                    <div key={assignment.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/10 transition-colors">
                      <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-white text-xs font-bold">{assignment.station.stationCode}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{assignment.selectedTask?.name || `Station ${assignment.station.stationCode}`}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                          Candidate Number: <span className="font-mono font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">{assignment.candidateNumber || "—"}</span>
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] py-0 px-2 h-5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                        Scheduled
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Widget / Sidebar) - Takes 1 col */}
        <div className="space-y-6">
          {/* Quick Stats Widget */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Profile Info</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Programme</p>
                <p className="text-sm font-bold text-foreground mt-1 truncate">{user?.programme?.fullName || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Student Index No.</p>
                <p className="text-sm font-mono font-bold text-foreground mt-1">{user?.staffId || user?.email || "—"}</p>
              </div>
              <div className="border-t border-border pt-4">
                <Link href="/student/results" className="block">
                  <Button className="w-full text-xs gradient-primary border-0 text-white font-medium cursor-pointer" size="sm">
                    <BarChart3 className="w-3.5 h-3.5 mr-2" /> View Exam Results
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Alert Widget */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Important Notice</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                OSCE/Practical examinations are physical clinical assessments. Your scores are submitted in real-time by examiners watching your physical execution. Results will show up on this portal after the administrator publishes them.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
