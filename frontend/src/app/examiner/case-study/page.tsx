"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  FileText, Search, User, Clipboard, Minus, Plus, Save,
  CheckCircle2, AlertCircle, Sparkles, BookOpen, Layers, Award
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Session {
  id: string;
  name: string;
  programmeId: string;
  programme: { name: string; fullName: string };
}

interface Student {
  id: string;
  name: string;
  email: string;
  staffId: string;
}

interface RubricItem {
  key: string;
  name: string;
  maxMarks: number;
  sortOrder: number;
}

interface RubricSubgroup {
  name: string;
  items: RubricItem[];
}

interface RubricSection {
  key: string;
  name: string;
  maxMarks: number;
  subgroups: RubricSubgroup[];
}

interface RubricData {
  id: string;
  name: string;
  maxScore: number;
  sections: RubricSection[];
}

export default function CaseStudyEvaluationPage() {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedRubricType, setSelectedRubricType] = useState<string>("MIDWIFERY_CASE_STUDY");

  // Marks state: { [itemKey]: number }
  const [itemMarks, setItemMarks] = useState<Record<string, number>>({});
  // Comments state: { [itemKey]: string }
  const [itemComments, setItemComments] = useState<Record<string, string>>({});

  // Fetch active sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["examiner-sessions"],
    queryFn: () => api.get("/sessions").then((r) => r.data.filter((s: any) => s.status === "ACTIVE" || s.status === "MARKING")),
  });

  const activeSessionObj = sessions?.find((s) => s.id === selectedSession);

  // Fetch candidates in session
  const { data: students } = useQuery<Student[]>({
    queryKey: ["session-students", selectedSession],
    queryFn: () => api.get(`/users?role=STUDENT&programmeId=${activeSessionObj?.programmeId}`).then((r) => r.data),
    enabled: !!selectedSession && !!activeSessionObj?.programmeId,
  });

  // Fetch rubric definition
  const { data: rubric, isLoading: rubricLoading } = useQuery<RubricData>({
    queryKey: ["case-study-rubric", selectedRubricType],
    queryFn: () => api.get(`/case-studies/rubric?type=${selectedRubricType}`).then((r) => r.data),
  });

  // Fetch existing evaluation for selected candidate
  const { data: existingEval, isLoading: evalLoading } = useQuery<any>({
    queryKey: ["case-study-eval", selectedSession, selectedStudent, selectedRubricType],
    queryFn: () =>
      api
        .get(`/case-studies/evaluations/${selectedSession}/student/${selectedStudent}?type=${selectedRubricType}`)
        .then((r) => r.data)
        .catch(() => null),
    enabled: !!selectedSession && !!selectedStudent,
  });

  // Populate form with existing marks and comments or default to 0
  useEffect(() => {
    if (rubric) {
      const marksMap: Record<string, number> = {};
      const commentsMap: Record<string, string> = {};

      rubric.sections.forEach((sec) => {
        sec.subgroups.forEach((sub) => {
          sub.items.forEach((item) => {
            marksMap[item.key] = 0;
            commentsMap[item.key] = "";
          });
        });
      });

      if (existingEval && existingEval.itemScores) {
        existingEval.itemScores.forEach((score: any) => {
          marksMap[score.itemKey] = score.marks ?? 0;
          commentsMap[score.itemKey] = score.comment ?? "";
        });
      }

      setItemMarks(marksMap);
      setItemComments(commentsMap);
    }
  }, [rubric, existingEval, selectedStudent]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.post("/case-studies/evaluations", payload),
    onSuccess: () => {
      toast.success("Case Study evaluation saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["case-study-eval"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save evaluation");
    },
  });

  const handleMarkChange = (itemKey: string, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, val));
    setItemMarks((prev) => ({ ...prev, [itemKey]: clamped }));
  };

  const handleCommentChange = (itemKey: string, comment: string) => {
    setItemComments((prev) => ({ ...prev, [itemKey]: comment }));
  };

  // Compute live totals per section & grand total
  const totals = useMemo(() => {
    if (!rubric) return { grandTotal: 0, sectionTotals: {} as Record<string, number> };

    const sectionTotals: Record<string, number> = {};
    let grandTotal = 0;

    rubric.sections.forEach((sec) => {
      let secTotal = 0;
      sec.subgroups.forEach((sub) => {
        sub.items.forEach((item) => {
          secTotal += itemMarks[item.key] || 0;
        });
      });
      sectionTotals[sec.key] = secTotal;
      grandTotal += secTotal;
    });

    return { grandTotal, sectionTotals };
  }, [rubric, itemMarks]);

  const handleSave = (isSubmitted: boolean = true) => {
    if (!selectedSession || !selectedStudent || !rubric) return;

    const itemScoresPayload: any[] = [];
    rubric.sections.forEach((sec) => {
      sec.subgroups.forEach((sub) => {
        sub.items.forEach((item) => {
          itemScoresPayload.push({
            sectionKey: sec.key,
            itemKey: item.key,
            itemName: `${item.name} (${item.maxMarks})`,
            marks: itemMarks[item.key] || 0,
            maxMarks: item.maxMarks,
            comment: itemComments[item.key] || "",
            sortOrder: item.sortOrder,
          });
        });
      });
    });

    saveMutation.mutate({
      studentId: selectedStudent,
      sessionId: selectedSession,
      type: selectedRubricType,
      itemScores: itemScoresPayload,
      isSubmitted,
    });
  };

  const studentObj = students?.find((s) => s.id === selectedStudent);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-600" />
            Case Study Evaluation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Official Nursing & Midwifery Practical Assessment Rubric
          </p>
        </div>

        {/* Rubric Type Switcher */}
        <div className="w-full sm:w-64">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Rubric Type
          </Label>
          <Select value={selectedRubricType} onValueChange={(val) => val && setSelectedRubricType(val)}>
            <SelectTrigger className="h-9 font-medium">
              <SelectValue placeholder="Select Rubric..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MIDWIFERY_CASE_STUDY">Midwifery Case Study (100 Mks)</SelectItem>
              <SelectItem value="OBSTETRIC_CASE_STUDY">Obstetrician Case Study (100 Mks)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card p-5 rounded-2xl border shadow-sm">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Exam Session</Label>
          <SearchableSelect
            value={selectedSession}
            onValueChange={(val) => {
              setSelectedSession(val);
              setSelectedStudent("");
            }}
            options={sessions?.map((s) => ({ label: `${s.name} (${s.programme.name})`, value: s.id })) ?? []}
            placeholder="Select session..."
            searchPlaceholder="Search sessions..."
            emptyMessage="No active sessions found."
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Candidate</Label>
          <SearchableSelect
            value={selectedStudent}
            onValueChange={setSelectedStudent}
            options={students?.map((s) => ({ label: `${s.name} (${s.staffId})`, value: s.id })) ?? []}
            placeholder={selectedSession ? "Select candidate..." : "First select a session..."}
            searchPlaceholder="Search candidate by name or index no..."
            emptyMessage="No candidates found."
            disabled={!selectedSession}
          />
        </div>
      </div>

      {!selectedStudent ? (
        <Card className="border-dashed p-10 text-center rounded-2xl bg-muted/20">
          <CardContent className="space-y-3 pt-6">
            <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h3 className="text-base font-bold text-foreground">No Candidate Selected</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Select an active exam session and candidate above to open the official Case Study evaluation rubric form.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Header Banner - Matching Image Banner */}
          <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 font-bold text-sm sm:text-base tracking-wide">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-200" />
              <span>CARE STUDY | CANDIDATE: {studentObj?.name?.toUpperCase()} ({studentObj?.staffId})</span>
            </div>
            <Badge className="bg-emerald-800 text-emerald-100 hover:bg-emerald-800 border-none">
              {rubric?.name}
            </Badge>
          </div>

          {/* Form Sections */}
          {rubricLoading || evalLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : (
            rubric?.sections.map((section) => {
              const secCurrent = totals.sectionTotals[section.key] || 0;
              return (
                <Card key={section.key} className="shadow-sm border rounded-2xl overflow-hidden">
                  {/* Section Header Bar - Matching Image Banner (Blue Bar) */}
                  <div className="bg-indigo-600 text-white px-5 py-3 flex items-center justify-between">
                    <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-200" />
                      {section.name} ({section.maxMarks})
                    </h2>
                    <Badge className="bg-indigo-800 text-white font-bold border-none text-xs">
                      Score: {secCurrent} / {section.maxMarks}
                    </Badge>
                  </div>

                  <CardContent className="p-4 sm:p-6 space-y-6">
                    {section.subgroups.map((subgroup, subIdx) => (
                      <div key={subIdx} className="space-y-4">
                        {subgroup.name !== "GENERAL" && (
                          <h3 className="text-xs font-black uppercase text-rose-600 tracking-wider border-b pb-1">
                            {subgroup.name}:
                          </h3>
                        )}

                        <div className="space-y-3">
                          {subgroup.items.map((item) => {
                            const val = itemMarks[item.key] ?? 0;
                            const comment = itemComments[item.key] ?? "";
                            return (
                              <div
                                key={item.key}
                                className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card/60 hover:bg-card transition-colors"
                              >
                                <div className="md:w-1/3">
                                  <Label className="text-sm font-semibold text-foreground">
                                    {item.name} ({item.maxMarks})
                                  </Label>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:w-2/3">
                                  {/* Mark Field */}
                                  <div className="flex items-center gap-1.5 sm:w-36">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 rounded-lg flex-shrink-0"
                                      onClick={() => handleMarkChange(item.key, val - 0.5, item.maxMarks)}
                                      disabled={val <= 0}
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </Button>
                                    <Input
                                      type="number"
                                      step={0.5}
                                      min={0}
                                      max={item.maxMarks}
                                      value={val}
                                      onChange={(e) =>
                                        handleMarkChange(item.key, parseFloat(e.target.value) || 0, item.maxMarks)
                                      }
                                      className="h-9 text-center font-bold text-sm"
                                      placeholder="Mark"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 rounded-lg flex-shrink-0"
                                      onClick={() => handleMarkChange(item.key, val + 0.5, item.maxMarks)}
                                      disabled={val >= item.maxMarks}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>

                                  {/* Comment Field */}
                                  <Input
                                    type="text"
                                    value={comment}
                                    onChange={(e) => handleCommentChange(item.key, e.target.value)}
                                    placeholder="Comment..."
                                    className="h-9 text-xs flex-1"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Floating Action & Total Score Bar */}
          <div className="fixed bottom-4 left-4 right-4 md:left-72 md:right-8 bg-card border-2 border-primary/20 shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-40 backdrop-blur-md bg-card/95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                {totals.grandTotal}
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Case Study Score</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-foreground">{totals.grandTotal} / 100 Marks</span>
                  <Badge variant={totals.grandTotal >= 50 ? "default" : "destructive"}>
                    {totals.grandTotal >= 50 ? "PASS" : "FAIL"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saveMutation.isPending}
                className="flex-1 sm:flex-initial"
              >
                Save Draft
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saveMutation.isPending}
                className="flex-1 sm:flex-initial gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? "Saving..." : "Submit Evaluation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
