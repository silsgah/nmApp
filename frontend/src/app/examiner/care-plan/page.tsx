"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Stethoscope, Search, User, Clipboard, 
  Minus, Plus, Save, Calendar, CheckCircle2 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";

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
  staffId: string; // Used as index number / student ID
}

interface CarePlanType {
  id: string;
  name: string;
  maxMarks: number;
}

interface CarePlanScore {
  carePlanTypeId: string;
  marks: number;
}

export default function CarePlanScoringPage() {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [localScores, setLocalScores] = useState<Record<string, number>>({});

  // Fetch active marking/active sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["examiner-sessions"],
    queryFn: () => api.get("/sessions").then((r) => r.data.filter((s: any) => s.status === "ACTIVE" || s.status === "MARKING")),
  });

  const activeSessionObj = sessions?.find((s) => s.id === selectedSession);

  // Fetch students in this session
  const { data: students, isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["session-students", selectedSession],
    queryFn: () => api.get(`/users?role=STUDENT&programmeId=${activeSessionObj?.programmeId}`).then((r) => r.data),
    enabled: !!selectedSession && !!activeSessionObj?.programmeId,
  });

  // Fetch Care Plan types for this session's programme
  const { data: planTypes, isLoading: typesLoading } = useQuery<CarePlanType[]>({
    queryKey: ["care-plan-types", activeSessionObj?.programmeId],
    queryFn: () => api.get(`/care-plans/types?programmeId=${activeSessionObj?.programmeId}`).then((r) => r.data),
    enabled: !!activeSessionObj?.programmeId,
  });

  // Fetch existing care plan scores for student
  const { data: existingScores } = useQuery<any[]>({
    queryKey: ["student-care-plan-scores", selectedSession, selectedStudent],
    queryFn: () => api.get(`/care-plans/scores/${selectedSession}/student/${selectedStudent}`).then((r) => r.data),
    enabled: !!selectedSession && !!selectedStudent,
  });

  // Load existing scores into local state
  useEffect(() => {
    if (planTypes) {
      const initial: Record<string, number> = {};
      planTypes.forEach((t) => {
        const found = existingScores?.find((s) => s.carePlanTypeId === t.id);
        initial[t.id] = found ? found.marks : 0;
      });
      setLocalScores(initial);
    }
  }, [existingScores, planTypes, selectedStudent]);

  // Mutation to save scores
  const saveMutation = useMutation({
    mutationFn: (payload: { studentId: string; sessionId: string; scores: CarePlanScore[] }) =>
      api.post("/care-plans/scores/batch", payload),
    onSuccess: () => {
      toast.success("Care Plan scores saved successfully");
      queryClient.invalidateQueries({ queryKey: ["student-care-plan-scores"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save Care Plan scores");
    },
  });

  const handleScoreChange = (typeId: string, val: number, max: number) => {
    const newVal = Math.max(0, Math.min(max, val));
    setLocalScores((prev) => ({ ...prev, [typeId]: newVal }));
  };

  const handleSave = () => {
    if (!selectedSession || !selectedStudent || !planTypes) return;
    const scores = planTypes.map((t) => ({
      carePlanTypeId: t.id,
      marks: localScores[t.id] ?? 0,
    }));
    saveMutation.mutate({
      studentId: selectedStudent,
      sessionId: selectedSession,
      scores,
    });
  };

  const studentObj = students?.find((s) => s.id === selectedStudent);

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-primary" />
          Care Plan Entry
        </h1>
        <p className="page-subtitle">Record and submit candidate marks for Care Plan component</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Session Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Session</Label>
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

        {/* Student Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Candidate</Label>
          <SearchableSelect
            value={selectedStudent}
            onValueChange={setSelectedStudent}
            options={students?.map((s) => ({ label: `${s.name} (${s.staffId})`, value: s.id })) ?? []}
            placeholder={selectedSession ? "Select candidate..." : "First select a session..."}
            searchPlaceholder="Search candidates..."
            emptyMessage="No candidates found."
            disabled={!selectedSession}
          />
        </div>
      </div>

      {selectedStudent && (
        <Card className="shadow-md border border-border/80 rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {studentObj?.name?.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">{studentObj?.name}</CardTitle>
                <CardDescription className="text-xs font-mono">
                  Index No: {studentObj?.staffId} · {activeSessionObj?.programme.fullName}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {typesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            ) : !planTypes || planTypes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Clipboard className="w-10 h-10 mx-auto mb-2 text-muted-foreground/35" />
                <p className="text-sm font-medium">No Care Plan configurations found for this programme.</p>
                <p className="text-xs text-muted-foreground/80 mt-1">Please ask administrator to configure Care Plan types under settings.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {planTypes.map((type) => {
                  const currentScore = localScores[type.id] ?? 0;
                  return (
                    <div key={type.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/50">
                      <div>
                        <p className="text-sm font-bold text-foreground">{type.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Maximum Marks: {type.maxMarks}</p>
                      </div>
                      
                      {/* +/- Control Interface */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleScoreChange(type.id, currentScore - 0.5, type.maxMarks)}
                          disabled={currentScore <= 0}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Input
                          type="number"
                          step={0.5}
                          min={0}
                          max={type.maxMarks}
                          value={currentScore}
                          onChange={(e) => handleScoreChange(type.id, parseFloat(e.target.value) || 0, type.maxMarks)}
                          className="h-8 w-16 text-center text-sm font-bold"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleScoreChange(type.id, currentScore + 0.5, type.maxMarks)}
                          disabled={currentScore >= type.maxMarks}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saveMutation.isPending ? "Saving..." : "Save Scores"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
