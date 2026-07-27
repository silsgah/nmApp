"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import {
  BarChart3, CheckCircle2, XCircle, Trophy,
  Download, AlertCircle, ChevronDown, ChevronUp,
  BookOpen, TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CategoryScore {
  categoryName: string; score: number; maxScore: number;
  percentage: number; passed: boolean;
  scaledScore: number; scaledMaxMarks: number;
}

interface StudentResult {
  id: string; overallScore: number; overallMaxScore: number;
  overallPercent: number; passed: boolean; grade: string; status: string;
  session: { id: string; name: string; semester: string; academicYear: string };
  categoryScores: Record<string, CategoryScore>;
  computedAt: string;
}

const gradeConfig: Record<string, { label: string; color: string; bg: string }> = {
  A:    { label: "Distinction",  color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  B:    { label: "Credit",       color: "text-blue-700 dark:text-blue-400",       bg: "bg-blue-100 dark:bg-blue-900/30" },
  C:    { label: "Pass",         color: "text-indigo-700 dark:text-indigo-400",   bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  D:    { label: "Borderline",   color: "text-amber-700 dark:text-amber-400",     bg: "bg-amber-100 dark:bg-amber-900/30" },
  FAIL: { label: "Fail",         color: "text-red-700 dark:text-red-400",         bg: "bg-red-100 dark:bg-red-900/30" },
};

export default function StudentResultsPage() {
  const { user } = useAuthStore();
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: sessions } = useQuery({
    queryKey: ["student-sessions", user?.id],
    queryFn: () => api.get(`/results/my-sessions?studentId=${user?.id}`).then((r) => r.data),
    enabled: !!user?.id,
  });

  const { data: result, isLoading } = useQuery<StudentResult>({
    queryKey: ["student-result", selectedSession, user?.id],
    queryFn: () => api.get(`/results/student/${user?.id}?sessionId=${selectedSession}`).then((r) => r.data),
    enabled: !!selectedSession && !!user?.id,
  });

  const downloadPdf = async () => {
    if (!result) return;
    setIsDownloading(true);
    try {
      const response = await api.get(`/results/${result.id}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `result_${result.session?.name?.replace(/\s+/g, "_") || "slip"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Result slip downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate and download PDF result slip");
    } finally {
      setIsDownloading(false);
    }
  };

  const gradeCfg = result ? gradeConfig[result.grade] ?? gradeConfig.FAIL : null;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">My Results</h1>
        <p className="page-subtitle">View your published examination results</p>
      </div>

      {/* Session picker */}
      <div className="max-w-sm">
        <SearchableSelect
          value={selectedSession}
          onValueChange={setSelectedSession}
          options={sessions?.map((s: { id: string; name: string }) => ({ label: s.name, value: s.id })) ?? []}
          placeholder="Select exam session..."
          searchPlaceholder="Search exam sessions..."
          emptyMessage="No exam sessions found."
        />
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      )}

      {!selectedSession && !isLoading && (
        <div className="rounded-2xl border border-dashed bg-muted/30 p-14 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/25" />
          <p className="font-medium text-muted-foreground">Select a session to view your results</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Only published results are visible here
          </p>
        </div>
      )}

      {selectedSession && !isLoading && !result && (
        <div className="rounded-2xl border border-dashed bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 p-10 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-amber-500" />
          <p className="font-semibold text-amber-800 dark:text-amber-300">Results not yet published</p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            Your results for this session are being processed. Check back soon.
          </p>
        </div>
      )}

      {result && result.status === "PUBLISHED" && gradeCfg && (
        <>
          {/* Main result hero card */}
          <div className={cn(
            "rounded-2xl border p-6 sm:p-8 relative overflow-hidden",
            result.passed
              ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
          )}>
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Grade circle */}
              <div className={cn(
                "w-28 h-28 rounded-full flex flex-col items-center justify-center flex-shrink-0 border-4 shadow-lg",
                result.passed
                  ? "border-emerald-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/30"
                  : "border-red-300 dark:border-red-700 bg-white dark:bg-red-900/30"
              )}>
                <span className={cn("text-4xl font-black", gradeCfg.color)}
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {result.grade}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  Grade
                </span>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {result.passed ? "Congratulations! 🎉" : "Not Passed"}
                  </h2>
                  <span className={cn(
                    "text-xs font-semibold px-3 py-1 rounded-full",
                    gradeCfg.bg, gradeCfg.color
                  )}>
                    {gradeCfg.label}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {result.session.name} · {result.session.semester} · {result.session.academicYear}
                </p>

                <div className="flex items-center gap-6 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Practical Score</p>
                    <p className="text-3xl font-black text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {result.overallScore.toFixed(1)}<span className="text-lg text-muted-foreground font-semibold">/{result.overallMaxScore}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Percentage</p>
                    <p className="text-lg font-bold text-foreground">
                      {result.overallPercent.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Result</p>
                    <div className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-bold mt-0.5",
                      result.passed ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                    )}>
                      {result.passed
                        ? <><CheckCircle2 className="w-4 h-4" /> PASS</>
                        : <><XCircle className="w-4 h-4" /> FAIL</>}
                    </div>
                  </div>
                </div>

                <Progress
                  value={result.overallPercent}
                  className={cn("h-2.5 mt-2", result.passed ? "[&>div]:bg-emerald-500" : "[&>div]:bg-red-500")}
                />
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          {result.categoryScores && Object.keys(result.categoryScores).length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpandedCategories((e) => !e)}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      Category Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">Scores per assessment category</CardDescription>
                  </div>
                  {expandedCategories
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </CardHeader>

              {expandedCategories && (
                <CardContent className="pt-0 space-y-4">
                  {Object.values(result.categoryScores).map((cat) => (
                    <div key={cat.categoryName} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{cat.categoryName}</span>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            out of {cat.scaledMaxMarks}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {cat.scaledScore?.toFixed(1)}/{cat.scaledMaxMarks}
                          </span>
                          <span className={cn(
                            "text-[10px] text-muted-foreground",
                            cat.percentage >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                            cat.percentage >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                          )}>
                            ({cat.percentage.toFixed(1)}%)
                          </span>
                          <span className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full",
                            cat.passed
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {cat.passed ? "Pass" : "Fail"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={cat.percentage}
                          className={cn(
                            "h-1.5 flex-1",
                            cat.percentage >= 70 ? "[&>div]:bg-emerald-500" :
                            cat.percentage >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"
                          )}
                        />
                        <span className="text-[11px] text-muted-foreground flex-shrink-0">
                          raw: {cat.score.toFixed(1)}/{cat.maxScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          {/* Download */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              className="gap-2"
              id="download-result-pdf-btn"
              onClick={downloadPdf}
              disabled={isDownloading}
            >
              <Download className="w-4 h-4" />
              {isDownloading ? "Generating PDF..." : "Download Result PDF"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
