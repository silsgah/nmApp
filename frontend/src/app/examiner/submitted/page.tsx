"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import {
  CheckSquare, Search, RefreshCw, Calendar, BookOpen,
  User, CheckCircle2, ChevronRight, ArrowLeft, Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

interface SubmittedScorecard {
  id: string;
  totalScore: number;
  maxPossibleScore: number;
  percentageScore: number;
  remarks: string | null;
  submittedAt: string;
  taskAttempt: { task: { id: string; name: string; maxScore: number } } | null;
  studentAssignment: {
    id: string;
    student: { id: string; name: string; staffId: string | null };
    station: {
      id: string;
      stationCode: string;
      task: { id: string; name: string; maxScore: number } | null;
      session: { id: string; name: string };
    };
  };
}

export default function SubmittedScorecardsPage() {
  const [search, setSearch] = useState("");

  const { data: scorecards, isLoading, refetch } = useQuery<SubmittedScorecard[]>({
    queryKey: ["my-submitted-scorecards"],
    queryFn: () => api.get("/scorecards/my-submitted").then((r) => r.data),
  });

  const filteredScorecards = scorecards?.filter((s) => {
    const term = search.toLowerCase();
    const taskName = s.taskAttempt?.task?.name ?? s.studentAssignment.station.task?.name ?? "Task unavailable";
    return (
      s.studentAssignment.student.name.toLowerCase().includes(term) ||
      (s.studentAssignment.student.staffId?.toLowerCase() || "").includes(term) ||
      taskName.toLowerCase().includes(term) ||
      s.studentAssignment.station.session.name.toLowerCase().includes(term)
    );
  }) ?? [];

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-sm">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="page-title text-xl font-bold tracking-tight text-foreground">Submitted Scorecards</h1>
            <p className="page-subtitle text-xs text-muted-foreground mt-0.5">Review and track all your finalized candidate gradings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 px-3 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Link href="/examiner/stations">
            <Button className="gradient-primary border-0 text-white shadow-md hover:opacity-90 h-9 px-4 cursor-pointer">
              Go to Grading
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/75" />
        <Input
          placeholder="Search by student, index, task or session..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Table Section */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider h-11">Candidate</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider h-11">Examination Station</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider h-11">Exam Session</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider h-11">Date Submitted</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right h-11">Grade Marks</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center h-11">Reconciliation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="hover:bg-muted/5">
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="px-6 py-4 text-right"><Skeleton className="h-6 w-16 ml-auto rounded-full" /></TableCell>
                  <TableCell className="px-6 py-4 text-center"><Skeleton className="h-7 w-20 mx-auto rounded-lg" /></TableCell>
                </TableRow>
              ))
            ) : filteredScorecards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <CheckSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-muted-foreground font-medium">No submitted scorecards found</p>
                  <p className="text-xs text-muted-foreground/75 mt-1">Scorecards you submit from your assigned stations will show here.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredScorecards.map((scorecard) => {
                const s = scorecard.studentAssignment;
                const task = scorecard.taskAttempt?.task ?? s.station.task;
                return (
                  <TableRow
                    key={scorecard.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    {/* Candidate */}
                    <TableCell className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {getInitials(s.student.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold font-mono text-foreground truncate">
                            {s.student.staffId ? `Index: ${s.student.staffId}` : "—"}
                          </p>
                          <span className="text-[10px] font-medium text-muted-foreground block truncate mt-0.5">
                            {s.student.name}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Examination Station */}
                    <TableCell className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded flex-shrink-0">
                          {s.station.stationCode}
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate max-w-[220px]">
                          {task?.name ?? "Task unavailable"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Exam Session */}
                    <TableCell className="px-6 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {s.station.session.name}
                    </TableCell>

                    {/* Submitted Date */}
                    <TableCell className="px-6 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(scorecard.submittedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </TableCell>

                    {/* Grade Marks */}
                    <TableCell className="px-6 py-3.5 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-foreground">
                          {scorecard.totalScore} / {scorecard.maxPossibleScore}
                        </span>
                        <Badge className="bg-emerald-50 hover:bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold py-0 h-4 mt-0.5 shadow-sm">
                          {Math.round(scorecard.percentageScore)}%
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Reconciliation Action */}
                    <TableCell className="px-6 py-3.5 text-center whitespace-nowrap">
                      <Link href={`/examiner/stations/${s.station.id}?assignmentId=${s.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7.5 px-2.5 text-xs font-semibold gap-1.5 border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer shadow-2xs"
                        >
                          <Scale className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Reconcile</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
