"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Session { id: string; name: string; programmeId: string; status: string }
interface Student { id: string; name: string; staffId: string | null }
interface Option { id: string; name: string; maxMarks: number; parentId: string | null; children: Option[] }

export default function ObstetricPage() {
  const [sessionId, setSessionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [anatomy, setAnatomy] = useState("");
  const [abnormal, setAbnormal] = useState("");
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const [firstMarks, setFirstMarks] = useState("");
  const [secondMarks, setSecondMarks] = useState("");

  const { data: sessions = [] } = useQuery<Session[]>({ queryKey: ["obstetric-sessions"], queryFn: () => api.get("/sessions").then((r) => r.data.filter((s: Session) => ["ACTIVE", "MARKING"].includes(s.status))) });
  const session = sessions.find((item) => item.id === sessionId);
  const { data: students = [] } = useQuery<Student[]>({ queryKey: ["obstetric-students", session?.programmeId], queryFn: () => api.get(`/users?role=STUDENT&programmeId=${session?.programmeId}`).then((r) => r.data), enabled: !!session });
  const { data: options = [] } = useQuery<Option[]>({ queryKey: ["obstetric-options", session?.programmeId], queryFn: () => api.get(`/obstetric/options?programmeId=${session?.programmeId}`).then((r) => r.data), enabled: !!session });

  const roots = options.filter((option) => !option.parentId);
  const first = options.find((option) => option.id === firstId);
  const secondChoices = useMemo(() => first?.children?.length ? first.children : roots.filter((option) => option.id !== firstId), [first, roots, firstId]);
  const second = options.find((option) => option.id === secondId) || first?.children?.find((option) => option.id === secondId);

  const submit = useMutation({
    mutationFn: () => api.post("/obstetric/evaluations", { studentId, sessionId, anatomyMarks: Number(anatomy), abnormalPregnancyMarks: Number(abnormal), selections: [{ optionId: firstId, marks: Number(firstMarks) }, { optionId: secondId, marks: Number(secondMarks) }], isSubmitted: true }),
    onSuccess: () => toast.success("Obstetric examination submitted"),
    onError: (error: { response?: { data?: { error?: string } } }) => toast.error(error.response?.data?.error || "Unable to submit examination"),
  });

  const complete = sessionId && studentId && anatomy !== "" && abnormal !== "" && firstId && secondId && firstMarks !== "" && secondMarks !== "";
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div><h1 className="page-title">Obstetric Examination</h1><p className="page-subtitle">Independent compulsory and optional-item assessment</p></div>
      <Card><CardHeader><CardTitle>Candidate</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Exam session</Label><Select value={sessionId} onValueChange={(value) => { setSessionId(value || ""); setStudentId(""); }}><SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger><SelectContent>{sessions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Student</Label><Select value={studentId} onValueChange={(value) => setStudentId(value || "")} disabled={!sessionId}><SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger><SelectContent>{students.map((item) => <SelectItem key={item.id} value={item.id}>{item.staffId || "No index"} — {item.name}</SelectItem>)}</SelectContent></Select></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Compulsory Items</CardTitle></CardHeader><CardContent className="space-y-4">
        <MarkRow label="Anatomy and Physiology" max={15} value={anatomy} onChange={setAnatomy} />
        <MarkRow label="Abnormal Pregnancies" max={15} value={abnormal} onChange={setAbnormal} />
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Optional Items (2)</CardTitle></CardHeader><CardContent className="space-y-4">
        <OptionRow label="First optional item" options={roots} value={firstId} onChange={(value) => { setFirstId(value); setSecondId(""); }} marks={firstMarks} onMarks={setFirstMarks} max={first?.maxMarks || 15} />
        <OptionRow label="Second optional item" options={secondChoices} value={secondId} onChange={setSecondId} marks={secondMarks} onMarks={setSecondMarks} max={second?.maxMarks || 15} disabled={!firstId} />
        {sessionId && roots.length === 0 && <p className="text-sm text-amber-700">No Obstetric optional items have been configured for this programme.</p>}
      </CardContent></Card>
      <div className="flex justify-end"><Button disabled={!complete || submit.isPending} onClick={() => submit.mutate()}>{submit.isPending ? "Submitting…" : "Submit Obstetric Score"}</Button></div>
    </div>
  );
}

function MarkRow({ label, max, value, onChange }: { label: string; max: number; value: string; onChange: (value: string) => void }) {
  return <div className="grid grid-cols-[1fr_140px] gap-4 items-center"><Label>{label} ({max})</Label><Input type="number" min={0} max={max} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Mark" /></div>;
}

function OptionRow({ label, options, value, onChange, marks, onMarks, max, disabled }: { label: string; options: Option[]; value: string; onChange: (value: string) => void; marks: string; onMarks: (value: string) => void; max: number; disabled?: boolean }) {
  return <div className="space-y-2"><Label>{label}</Label><div className="grid grid-cols-[1fr_140px] gap-4"><Select value={value} onValueChange={(item) => onChange(item || "")} disabled={disabled}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent></Select><Input type="number" min={0} max={max} value={marks} onChange={(event) => onMarks(event.target.value)} placeholder={`Mark / ${max}`} /></div></div>;
}
