"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import {
  FileText, Search, User, Calendar, CheckCircle2, XCircle,
  Eye, Trash2, Printer, Download, Sparkles, Filter, Layers
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Session {
  id: string;
  name: string;
  programmeId: string;
  programme: { name: string; fullName: string };
}

interface Evaluation {
  id: string;
  studentId: string;
  sessionId: string;
  type: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  isSubmitted: boolean;
  submittedAt: string;
  student: { id: string; name: string; email: string; staffId: string };
  examiner: { id: string; name: string; staffId: string };
  itemScores: {
    id: string;
    sectionKey: string;
    itemKey: string;
    itemName: string;
    marks: number;
    maxMarks: number;
    comment: string | null;
  }[];
}

export default function AdminCaseStudiesPage() {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeEval, setActiveEval] = useState<Evaluation | null>(null);

  // Fetch active / marking sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["admin-sessions"],
    queryFn: () => api.get("/sessions").then((r) => r.data),
  });

  // Fetch case study evaluations for selected session
  const { data: evaluations, isLoading: evalsLoading } = useQuery<Evaluation[]>({
    queryKey: ["admin-case-studies", selectedSession],
    queryFn: () => api.get(`/case-studies/evaluations/${selectedSession}`).then((r) => r.data),
    enabled: !!selectedSession,
  });

  // Delete evaluation mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/case-studies/evaluations/${id}`),
    onSuccess: () => {
      toast.success("Case Study evaluation deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-case-studies"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete evaluation");
    },
  });

  const filteredEvals = evaluations?.filter(
    (e) =>
      e.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.student.staffId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-600" />
            Case Study Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View, audit, and export candidate Case Study evaluation rubrics and scores
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card p-5 rounded-2xl border shadow-sm">
        <div className="space-y-1.5 md:col-span-1">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Exam Session</Label>
          <SearchableSelect
            value={selectedSession}
            onValueChange={setSelectedSession}
            options={sessions?.map((s) => ({ label: `${s.name} (${s.programme.name})`, value: s.id })) ?? []}
            placeholder="Select session..."
            searchPlaceholder="Search sessions..."
            emptyMessage="No sessions found."
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Search Candidate</Label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate by name or index no..."
              className="pl-9"
              disabled={!selectedSession}
            />
          </div>
        </div>
      </div>

      {/* Evaluations Table */}
      {!selectedSession ? (
        <Card className="border-dashed p-10 text-center rounded-2xl bg-muted/20">
          <CardContent className="space-y-3 pt-6">
            <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h3 className="text-base font-bold text-foreground">Select an Exam Session</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Select an exam session above to load candidate Case Study evaluations and rubrics.
            </p>
          </CardContent>
        </Card>
      ) : evalsLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : !filteredEvals || filteredEvals.length === 0 ? (
        <Card className="p-10 text-center rounded-2xl">
          <CardContent className="space-y-2 pt-6">
            <XCircle className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-base font-bold">No Case Study Evaluations Found</h3>
            <p className="text-xs text-muted-foreground">No evaluations recorded for candidates in this session yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md border rounded-2xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold">Index No.</TableHead>
                <TableHead className="font-bold">Candidate Name</TableHead>
                <TableHead className="font-bold">Rubric Type</TableHead>
                <TableHead className="font-bold">Examiner</TableHead>
                <TableHead className="font-bold text-center">Score (/100)</TableHead>
                <TableHead className="font-bold text-center">Status</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvals.map((evalObj) => (
                <TableRow key={evalObj.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs font-bold">{evalObj.student.staffId}</TableCell>
                  <TableCell className="font-bold text-foreground">{evalObj.student.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {evalObj.type === "MIDWIFERY_CASE_STUDY" ? "Midwifery Rubric" : "Obstetric Rubric"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{evalObj.examiner?.name || "System"}</TableCell>
                  <TableCell className="text-center font-black text-sm">
                    {evalObj.totalScore} / {evalObj.maxScore} ({evalObj.percentage}%)
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={evalObj.percentage >= 50 ? "default" : "destructive"}>
                      {evalObj.percentage >= 50 ? "PASS" : "FAIL"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8"
                      onClick={() => setActiveEval(evalObj)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Rubric
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Delete Case Study evaluation for ${evalObj.student.name}?`)) {
                          deleteMutation.mutate(evalObj.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Rubric View Dialog */}
      <Dialog open={!!activeEval} onOpenChange={(open) => !open && setActiveEval(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl">
          {activeEval && (
            <div className="space-y-6 print:p-0">
              <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-md flex items-center justify-between font-bold">
                <div>
                  <h3 className="text-base tracking-wide">
                    CARE STUDY | CANDIDATE: {activeEval.student.name.toUpperCase()} ({activeEval.student.staffId})
                  </h3>
                  <p className="text-xs font-normal text-emerald-100 mt-0.5">
                    Evaluated by Examiner: {activeEval.examiner?.name} on {new Date(activeEval.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black">{activeEval.totalScore} / 100</span>
                  <p className="text-xs text-emerald-100 uppercase">{activeEval.percentage >= 50 ? "PASSED" : "FAILED"}</p>
                </div>
              </div>

              {/* Breakdown List */}
              <div className="space-y-4">
                <Table className="border rounded-xl">
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="font-bold">Criterion / Item</TableHead>
                      <TableHead className="font-bold text-center w-28">Score</TableHead>
                      <TableHead className="font-bold">Examiner Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeEval.itemScores?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-xs text-foreground">
                          {item.itemName}
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs">
                          {item.marks} / {item.maxMarks}
                        </TableCell>
                        <TableCell className="text-xs italic text-muted-foreground">
                          {item.comment || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t print:hidden">
                <Button variant="outline" onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print Evaluation
                </Button>
                <Button onClick={() => setActiveEval(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
