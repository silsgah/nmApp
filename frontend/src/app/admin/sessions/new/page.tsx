"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Settings2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

interface Programme { id: string; name: string; fullName: string }

export default function NewSessionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", semester: "", academicYear: "", programmeId: "",
    yearLevel: 2,
    startDate: "", endDate: "",
    config: { examinerCount: 3, overallPassMark: 50, scoreAggregation: "AVERAGE" },
  });

  const { data: programmes } = useQuery<Programme[]>({
    queryKey: ["programmes"],
    queryFn: () => api.get("/programmes").then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post("/sessions", {
      ...data,
      yearLevel: Number(data.yearLevel),
    }),
    onSuccess: (res) => {
      toast.success("Exam session created!");
      router.push(`/admin/sessions/${res.data.id}`);
    },
    onError: () => toast.error("Failed to create session"),
  });

  const set = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setConfig = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, config: { ...f.config, [field]: value } }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.programmeId) { toast.error("Please select a programme"); return; }
    mutation.mutate(form);
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/sessions">
          <Button variant="outline" size="icon" className="w-8 h-8" id="back-btn">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="page-title">Create Exam Session</h1>
          <p className="page-subtitle">Configure a new practical examination session</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Session Details
            </CardTitle>
            <CardDescription>Basic information about this examination session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-name">Session Name *</Label>
              <Input
                id="session-name"
                placeholder="e.g. 2024 Semester 2 RGN Practical Examinations"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="programme">Programme *</Label>
                <Select
                  value={form.programmeId}
                  onValueChange={(v) => set("programmeId", v ?? "")}
                  items={programmes?.map((p) => ({ label: `${p.name} — ${p.fullName}`, value: p.id }))}
                >
                  <SelectTrigger id="programme" className="h-10">
                    <SelectValue placeholder="Select programme" />
                  </SelectTrigger>
                  <SelectContent>
                    {programmes?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {p.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">Semester *</Label>
                <Select
                  value={form.semester}
                  onValueChange={(v) => set("semester", v ?? "")}
                  items={[
                    { label: "Semester 1", value: "Semester 1" },
                    { label: "Semester 2", value: "Semester 2" },
                    { label: "Resit", value: "Resit" },
                    { label: "Supplementary", value: "Supplementary" }
                  ]}
                >
                  <SelectTrigger id="semester" className="h-10">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semester 1">Semester 1</SelectItem>
                    <SelectItem value="Semester 2">Semester 2</SelectItem>
                    <SelectItem value="Resit">Resit</SelectItem>
                    <SelectItem value="Supplementary">Supplementary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="academic-year">Academic Year *</Label>
                <Input
                  id="academic-year"
                  placeholder="e.g. 2024/2025"
                  value={form.academicYear}
                  onChange={(e) => set("academicYear", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year-level">Year Level *</Label>
                <Select
                  value={form.yearLevel.toString()}
                  onValueChange={(v) => set("yearLevel", parseInt(v || "2") || 2)}
                >
                  <SelectTrigger id="year-level" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">Year 2</SelectItem>
                    <SelectItem value="3">Year 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date (optional)</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date (optional)</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exam Config */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" /> Examination Configuration
            </CardTitle>
            <CardDescription>These settings are fully configurable and can be changed later</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="examiner-count">Examiners per Station</Label>
                <Input
                  id="examiner-count"
                  type="number"
                  min={1}
                  max={10}
                  value={form.config.examinerCount}
                  onChange={(e) => setConfig("examinerCount", parseInt(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">Default: 3 examiners</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pass-mark">Overall Pass Mark (%)</Label>
                <Input
                  id="pass-mark"
                  type="number"
                  min={0}
                  max={100}
                  value={form.config.overallPassMark}
                  onChange={(e) => setConfig("overallPassMark", parseFloat(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">Minimum % to pass overall</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aggregation">Score Aggregation</Label>
                <Select
                  value={form.config.scoreAggregation}
                  onValueChange={(v) => setConfig("scoreAggregation", v ?? "AVERAGE")}
                  items={[
                    { label: "Average of examiners", value: "AVERAGE" },
                    { label: "Sum of examiners", value: "SUM" },
                    { label: "Highest examiner score", value: "HIGHEST" }
                  ]}
                >
                  <SelectTrigger id="aggregation" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVERAGE">Average of examiners</SelectItem>
                    <SelectItem value="SUM">Sum of examiners</SelectItem>
                    <SelectItem value="HIGHEST">Highest examiner score</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">How multiple examiner scores are combined</p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Category-level pass marks and weights can be configured after session creation, on the session detail page.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/admin/sessions">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button
            type="submit"
            className="gradient-primary border-0 text-white shadow-md hover:opacity-90"
            disabled={mutation.isPending}
            id="create-session-submit-btn"
          >
            {mutation.isPending ? "Creating..." : "Create Session"}
          </Button>
        </div>
      </form>
    </div>
  );
}
