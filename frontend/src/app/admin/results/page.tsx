"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  BarChart3, Play, Download, Search, ChevronDown,
  CheckCircle2, XCircle, Trophy, Users, TrendingUp,
  RefreshCw, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { FileText, Award, ShieldCheck, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StudentResult {
  id: string; overallScore: number; overallMaxScore: number;
  overallPercent: number; passed: boolean; grade: string; status: string;
  student: { id: string; name: string; email: string; staffId: string | null };
  session: { name: string; semester: string; academicYear: string };
  categoryScores: Record<string, { categoryName: string; score: number; maxScore: number; percentage: number; scaledScore: number; scaledMaxMarks: number; passed: boolean }>;
}

interface Session { id: string; name: string; status: string; programme: { name: string } }

const gradeColors: Record<string, string> = {
  A:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  B:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  C:    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  D:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  FAIL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function ResultsPage() {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [search, setSearch] = useState("");
  const [passFilter, setPassFilter] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<"compute" | "publish" | null>(null);
  const [page, setPage] = useState(1);
  const [detailResultId, setDetailResultId] = useState<string | null>(null);

  const [pendingExams, setPendingExams] = useState<any[] | null>(null);

  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["sessions"],
    queryFn: () => api.get("/sessions?activeOnly=true").then((r) => r.data),
  });

  const { data: results, isLoading: resultsLoading, refetch } = useQuery<StudentResult[]>({
    queryKey: ["results", selectedSession],
    queryFn: () => api.get(`/results/session/${selectedSession}`).then((r) => r.data),
    enabled: !!selectedSession,
  });

  const { data: summary } = useQuery({
    queryKey: ["results-summary", selectedSession],
    queryFn: () => api.get(`/results/summary/${selectedSession}`).then((r) => r.data),
    enabled: !!selectedSession,
  });

  const computeMutation = useMutation({
    mutationFn: () => api.post(`/results/compute/${selectedSession}`),
    onSuccess: (res) => {
      toast.success(`Computed results for ${res.data.count} students`);
      queryClient.invalidateQueries({ queryKey: ["results"] });
      queryClient.invalidateQueries({ queryKey: ["results-summary"] });
      refetch();
      setConfirmAction(null);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error || "Failed to compute results";
      const pendingList = err.response?.data?.pending;
      if (pendingList && pendingList.length > 0) {
        setPendingExams(pendingList);
      } else {
        toast.error(errMsg);
      }
      setConfirmAction(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => api.post(`/results/publish/${selectedSession}`),
    onSuccess: () => {
      toast.success("Results published! Students can now view their scores.");
      queryClient.invalidateQueries({ queryKey: ["results"] });
      setConfirmAction(null);
    },
    onError: () => toast.error("Failed to publish results"),
  });

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const downloadBroadsheetPdf = async () => {
    if (!selectedSession) return;
    setIsDownloadingPdf(true);
    try {
      const response = await api.get(`/results/session/${selectedSession}/broadsheet/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `broadsheet_${selectedSessionObj?.name?.replace(/\s+/g, "_") || "results"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF Broadsheet downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF Broadsheet");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const exportToExcel = () => {
    if (!results || results.length === 0) return;
    
    // Header row
    const headers = ["No.", "Student Name", "Email", "Index / Staff ID", "Overall Score", "Max Marks", "Percentage", "Grade", "Outcome"];
    
    // Rows data
    const rows = filtered.map((r, idx) => [
      idx + 1,
      r.student.name,
      r.student.email,
      r.student.staffId || "",
      r.overallScore.toFixed(1),
      r.overallMaxScore,
      `${r.overallPercent.toFixed(1)}%`,
      r.grade || "",
      r.passed ? "PASS" : "FAIL"
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `results_broadsheet_${selectedSessionObj?.name?.replace(/\s+/g, "_") || "session"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Excel broadsheet exported successfully");
  };

  const filtered = results?.filter((r) => {
    const matchSearch = r.student.name.toLowerCase().includes(search.toLowerCase()) ||
      r.student.email.toLowerCase().includes(search.toLowerCase());
    const matchPass = passFilter === "all" || (passFilter === "pass" ? r.passed : !r.passed);
    return matchSearch && matchPass;
  }) ?? [];

  const limit = 15;
  const total = filtered.length;
  const paginatedResults = filtered.slice((page - 1) * limit, page * limit);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handlePassFilterChange = (val: string | null) => {
    setPassFilter(val ?? "all");
    setPage(1);
  };

  const selectedSessionObj = sessions?.find((s) => s.id === selectedSession);
  const isPublished = filtered.length > 0 && filtered.every((r) => r.status === "PUBLISHED");

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Results Management</h1>
          <p className="page-subtitle">Compute, review, and publish examination results</p>
        </div>
        {selectedSession && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction("compute")}
              id="compute-results-btn"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Compute Results
            </Button>
            {!isPublished && results && results.length > 0 && (
              <Button
                className="gradient-primary border-0 text-white hover:opacity-90 shadow-md"
                size="sm"
                onClick={() => setConfirmAction("publish")}
                id="publish-results-btn"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" /> Publish Results
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Session selector */}
      <div className="max-w-sm">
        <SearchableSelect
          value={selectedSession}
          onValueChange={setSelectedSession}
          options={sessions?.map((s) => ({ label: `${s.name} · ${s.programme?.name}`, value: s.id })) ?? []}
          placeholder="Select an exam session to view results..."
          searchPlaceholder="Search exam sessions..."
        />
      </div>

      {selectedSession && (
        <>
          {/* Summary stats */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-4">
              {[
                { label: "Total Students", value: summary.total, icon: Users, color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" },
                { label: "Passed", value: summary.passed, icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
                { label: "Failed", value: summary.failed, icon: XCircle, color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
                { label: "Pass Rate", value: `${summary.passRate}%`, icon: TrendingUp, color: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" },
                { label: "Avg Score", value: `${summary.avgScore}%`, icon: Trophy, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                      <p className="text-2xl font-bold mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
                    </div>
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pass rate bar */}
          {summary && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pass rate</span>
                <span className="font-semibold text-foreground">{summary.passRate}% ({summary.passed}/{summary.total})</span>
              </div>
              <Progress value={summary.passRate} className="h-3 rounded-full" />
            </div>
          )}

          {/* Grade distribution */}
          {summary?.gradeDistribution && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.gradeDistribution as Record<string, number>)
                .filter(([, count]) => count > 0)
                .map(([grade, count]) => (
                  <span key={grade} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border", gradeColors[grade] ?? "bg-muted text-muted-foreground")}>
                    {grade}: {count} student{Number(count) !== 1 ? "s" : ""}
                  </span>
                ))}
            </div>
          )}

          {/* Filters */}
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="results-search"
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={passFilter} onValueChange={handlePassFilterChange}>
                <SelectTrigger className="w-36 h-9" id="pass-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All results</SelectItem>
                  <SelectItem value="pass">Passed only</SelectItem>
                  <SelectItem value="fail">Failed only</SelectItem>
                </SelectContent>
              </Select>
              {isPublished && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 px-3 py-1.5 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1.5" /> Published — Students can view results
                </Badge>
              )}
            </div>

            {results && results.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadBroadsheetPdf}
                  disabled={isDownloadingPdf}
                  className="h-9 px-3 border-border text-muted-foreground hover:text-foreground cursor-pointer"
                  id="export-pdf-broadsheet-btn"
                >
                  <FileText className="w-4 h-4 mr-1.5 text-red-500" />
                  {isDownloadingPdf ? "Exporting PDF..." : "Export PDF Broadsheet"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToExcel}
                  className="h-9 px-3 border-border text-muted-foreground hover:text-foreground cursor-pointer"
                  id="export-excel-broadsheet-btn"
                >
                  <Download className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Export Excel Broadsheet
                </Button>
              </div>
            )}
          </div>

          {/* Results table */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Candidate</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Index / Staff ID</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Overall Score</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Percentage</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Grade</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Outcome</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right h-11">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultsLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="hover:bg-muted/5">
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 rounded ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">
                        {results?.length === 0
                          ? "No results yet — click \"Compute Results\" to generate"
                          : "No results match your filter"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedResults.map((result) => (
                    <TableRow
                      key={result.id}
                      className="hover:bg-muted/20 transition-colors"
                      id={`result-row-${result.id}`}
                    >
                      {/* Student */}
                      <TableCell className="px-6 py-3.5">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{result.student.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.student.email}</p>
                        </div>
                      </TableCell>

                      {/* Index No */}
                      <TableCell className="px-6 py-3.5 text-xs font-mono text-muted-foreground">
                        {result.student.staffId || "—"}
                      </TableCell>

                      {/* Overall Score */}
                      <TableCell className="px-6 py-3.5 text-xs text-muted-foreground font-semibold">
                        {result.overallScore.toFixed(1)} / {result.overallMaxScore}
                      </TableCell>

                      {/* Percent */}
                      <TableCell className="px-6 py-3.5 text-sm font-bold text-foreground">
                        {result.overallPercent.toFixed(1)}%
                      </TableCell>

                      {/* Grade */}
                      <TableCell className="px-6 py-3.5">
                        <span className={cn(
                          "inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold border shadow-sm",
                          gradeColors[result.grade] ?? "bg-muted text-muted-foreground"
                        )}>
                          {result.grade}
                        </span>
                      </TableCell>

                      {/* Outcome */}
                      <TableCell className="px-6 py-3.5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-sm",
                          result.passed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                        )}>
                          {result.passed ? (
                            <><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Pass</>
                          ) : (
                            <><XCircle className="w-3 h-3 text-red-600" /> Fail</>
                          )}
                        </span>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="px-6 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 hover:bg-muted cursor-pointer"
                          id={`view-result-${result.id}`}
                          onClick={() => setDetailResultId(result.id)}
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Premium Pagination Footer */}
            {total > 0 && (
              <div className="px-6 py-4 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{Math.min((page - 1) * limit + 1, total)}</span> to{" "}
                  <span className="font-semibold text-foreground">{Math.min(page * limit, total)}</span> of{" "}
                  <span className="font-semibold text-foreground">{total}</span> results
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    First
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </Button>
                  <span className="text-xs font-semibold text-foreground bg-muted border border-border px-3 py-1.5 rounded-lg mx-1">
                    Page {page} of {Math.ceil(total / limit)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setPage(page + 1)}
                    disabled={page * limit >= total}
                  >
                    Next
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setPage(Math.ceil(total / limit))}
                    disabled={page * limit >= total}
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Compute confirm */}
      <AlertDialog open={confirmAction === "compute"} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Compute Results</AlertDialogTitle>
            <AlertDialogDescription>
              This will calculate scores for all students in this session using submitted scorecards. Any existing computed results will be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => computeMutation.mutate()}
              className="gradient-primary border-0 text-white"
            >
              {computeMutation.isPending ? "Computing..." : "Compute Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish confirm */}
      <AlertDialog open={confirmAction === "publish"} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Results</AlertDialogTitle>
            <AlertDialogDescription>
              Once published, all students can view their results. This action cannot be undone without admin access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => publishMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
            >
              {publishMutation.isPending ? "Publishing..." : "Publish to Students"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pending Exams Alert Dialog */}
      <AlertDialog open={pendingExams !== null} onOpenChange={() => setPendingExams(null)}>
        <AlertDialogContent className="max-w-xl rounded-2xl border border-border/80 shadow-lg p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              Cannot Compute Results — Pending Evaluations
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
              Some examiners have not yet submitted their scorecards for this session. All stations must have fully submitted scorecards before overall marks can be calculated.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 border rounded-xl overflow-hidden bg-muted/10 divide-y max-h-60 overflow-y-auto no-scrollbar">
            {pendingExams?.map((p: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center gap-4 px-4 py-3 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{p.studentName}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Task: {p.taskName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge variant="secondary" className="font-mono text-[9px] bg-amber-500/10 text-amber-600 border-0">
                    Station {p.stationCode}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Examiner: {p.examinerName}</p>
                </div>
              </div>
            ))}
          </div>

          <AlertDialogFooter className="border-t border-border/40 pt-4 mt-2">
            <AlertDialogAction
              onClick={() => setPendingExams(null)}
              className="gradient-primary border-0 text-white hover:opacity-90 px-4 cursor-pointer"
            >
              Acknowledge & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Detailed Assessment Booklet Modal */}
      {detailResultId && (
        <ResultDetailDialog
          resultId={detailResultId}
          onClose={() => setDetailResultId(null)}
        />
      )}
    </div>
  );
}

function ResultDetailDialog({
  resultId,
  onClose,
}: {
  resultId: string;
  onClose: () => void;
}) {
  const { data: details, isLoading } = useQuery({
    queryKey: ["result-details", resultId],
    queryFn: () => api.get(`/results/${resultId}/details`).then((r) => r.data),
    enabled: !!resultId,
  });

  const [activeStationIdx, setActiveStationIdx] = useState(0);

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <div className="space-y-4 py-8">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const formatRemarks = (remarksStr: string | null | undefined) => {
    if (!remarksStr) return "No comments entered.";
    try {
      if (remarksStr.trim().startsWith("{")) {
        const parsed = JSON.parse(remarksStr);
        return parsed.text || "No comments entered.";
      }
    } catch {
      // ignore
    }
    return remarksStr;
  };

  if (!details) return null;

  const { result, components } = details;
  const currentComp = components?.[activeStationIdx];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md",
              result.passed ? "bg-emerald-600" : "bg-red-600"
            )}>
              {result.grade}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Candidate Practical Examination Booklet</DialogTitle>
              <DialogDescription className="text-xs">
                Detailed clinical component assessment records for {result.student.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Candidate Metadata Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border border-border/40 text-xs">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Candidate Name</p>
            <p className="text-sm font-semibold text-foreground">{result.student.name}</p>
            <p className="text-muted-foreground">Index No: {result.student.staffId || "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Exam Session</p>
            <p className="text-sm font-semibold text-foreground">{result.session.name}</p>
            <p className="text-muted-foreground">{result.session.semester} · {result.session.academicYear}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Overall Examination Outcome</p>
            <p className="text-sm font-bold flex items-center gap-1">
              <span className={result.passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                {result.passed ? "✓ PASS" : "✗ FAIL"}
              </span>
              <span className="text-muted-foreground font-normal">({result.overallPercent.toFixed(1)}%)</span>
            </p>
            <p className="text-muted-foreground">Raw: {result.overallScore.toFixed(1)} / {result.overallMaxScore}</p>
          </div>
        </div>

        {/* Station Navigation Tabs */}
        {components && components.length > 0 ? (
          <div className="space-y-4">
            <div className="flex border-b border-border/40 gap-2 overflow-x-auto pb-1 no-scrollbar">
              {components.map((comp: any, idx: number) => (
                <button
                  key={comp.stationCode}
                  onClick={() => setActiveStationIdx(idx)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap",
                    activeStationIdx === idx
                      ? "gradient-primary border-0 text-white shadow-sm"
                      : "border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  Station {comp.stationCode}
                </button>
              ))}
            </div>

            {currentComp && (
              <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden p-6 space-y-6">
                {/* PDF Cover-sheet Equivalent Header */}
                <div className="border-b border-dashed border-border/60 pb-4 flex justify-between flex-wrap gap-4 text-xs font-mono text-muted-foreground">
                  <div>
                    <span className="font-bold text-foreground">INDEX NUMBER:</span> {result.student.staffId || "—"}
                  </div>
                  <div>
                    <span className="font-bold text-foreground">CENTRE:</span> {result.session.name.split(" ")[0]} Examination Centre
                  </div>
                  <div>
                    <span className="font-bold text-foreground">STATION CODE:</span> {currentComp.stationCode}
                  </div>
                </div>

                {/* Rubric Title & Key */}
                <div className="space-y-3">
                  <h3 className="text-center text-sm font-black text-foreground tracking-wide uppercase font-serif">
                    {currentComp.task.name}
                  </h3>
                  
                  {/* Rating Key Info Block */}
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/40 text-[10px] space-y-1 text-muted-foreground">
                    <p className="font-bold text-foreground uppercase tracking-wider text-[9px]">Rubric Performance Rating Key:</p>
                    {currentComp.task.ratingScale === "SCALE_0_4" ? (
                      <p>
                        <strong>0</strong> = Step omitted &nbsp;|&nbsp; 
                        <strong>1</strong> = Technique not well done &nbsp;|&nbsp; 
                        <strong>2</strong> = Performed correctly with hesitation &nbsp;|&nbsp; 
                        <strong>3</strong> = Performed correctly with evidence &nbsp;|&nbsp; 
                        <strong>4</strong> = Excellently with speed and style
                      </p>
                    ) : (
                      <p>
                        <strong>0</strong> = Step omitted &nbsp;|&nbsp; 
                        <strong>1</strong> = Partial or hesitant performance &nbsp;|&nbsp; 
                        <strong>2</strong> = Perfect execution
                      </p>
                    )}
                  </div>
                </div>

                {/* Checklist Steps Table */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Clinical Checklist Steps Rubric</p>
                  <div className="border rounded-xl overflow-hidden divide-y divide-border/40 text-xs bg-muted/5">
                    {currentComp.task.steps.map((step: any) => (
                      <div key={step.id} className="flex justify-between items-start gap-4 px-3 py-2">
                        <span className="font-mono text-muted-foreground font-semibold w-6">{step.stepNumber}.</span>
                        <span className="flex-1 text-foreground leading-relaxed font-medium">{step.description}</span>
                        <div className="flex gap-0.5 select-none opacity-45">
                          {currentComp.task.ratingScale === "SCALE_0_4" 
                            ? [0, 1, 2, 3, 4].map(n => <span key={n} className="w-4 h-4 rounded border text-[9px] flex items-center justify-center">{n}</span>)
                            : [0, 1, 2].map(n => <span key={n} className="w-4 h-4 rounded border text-[9px] flex items-center justify-center">{n}</span>)
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Examiner Assessment Grading Cards */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Examiner Assessment Details</p>
                  
                  {currentComp.scorecards && currentComp.scorecards.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {currentComp.scorecards.map((sc: any, idx: number) => (
                        <div key={idx} className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between gap-3 text-xs relative overflow-hidden">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <p className="font-bold text-sm text-foreground flex items-center gap-1.5 leading-tight">
                                <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                                {sc.examinerName}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono bg-muted/65 px-2 py-0.5 rounded-md inline-block">
                                Rank/ID: {sc.examinerStaffId || "No Staff ID"}
                              </p>
                            </div>
                            
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-black text-primary font-mono">{sc.percentageScore.toFixed(1)}%</p>
                              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                Score: <strong className="text-foreground">{sc.totalScore.toFixed(1)}/{sc.maxPossibleScore}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="bg-muted/30 p-2.5 rounded-lg border border-border/40 text-[11px] leading-relaxed italic text-muted-foreground font-medium">
                            Remarks: <span className="text-foreground not-italic font-semibold">{formatRemarks(sc.remarks)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic text-center py-4 bg-muted/20 rounded-lg">
                      No examiner has graded this station's components yet.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-10 bg-muted/10 rounded-2xl">
            No station assignments found for this candidate results session.
          </p>
        )}

        <DialogFooter className="border-t border-border/40 pt-4">
          <Button variant="outline" onClick={onClose}>Close Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
