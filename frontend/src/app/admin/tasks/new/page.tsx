"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft, BookOpen, Plus, Trash2, Star, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Programme { id: string; name: string; fullName: string }
interface Category { id: string; name: string; programmeId: string }

interface StepDraft {
  description: string;
  isKeyStep: boolean;
}

export default function NewTaskPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    description: "",
    ratingScale: "SCALE_0_4",
    maxScore: 0,
    categoryId: "",
    sortOrder: 0,
  });

  const [selectedProgrammes, setSelectedProgrammes] = useState<string[]>([]);
  const [selectedYearLevels, setSelectedYearLevels] = useState<number[]>([]);
  const [steps, setSteps] = useState<StepDraft[]>([{ description: "", isKeyStep: false }]);

  const { data: programmes } = useQuery<Programme[]>({
    queryKey: ["programmes"],
    queryFn: () => api.get("/programmes").then((r) => r.data),
  });

  const { data: allCategories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  });

  const categories = allCategories?.filter((c) => selectedProgrammes.includes(c.programmeId)) ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/tasks", {
        ...form,
        programmeIds: selectedProgrammes,
        yearLevels: selectedYearLevels,
        maxScore: Number(form.maxScore),
        sortOrder: Number(form.sortOrder),
        categoryId: form.categoryId === "none" || !form.categoryId ? undefined : form.categoryId,
        steps: steps
          .filter((s) => s.description.trim())
          .map((s, i) => ({
            stepNumber: i + 1,
            description: s.description.trim(),
            isKeyStep: s.isKeyStep,
          })),
      }),
    onSuccess: (res) => {
      toast.success("Task created successfully!");
      router.push(`/admin/tasks/${res.data.id}`);
    },
    onError: () => toast.error("Failed to create task"),
  });

  const addStep = () => setSteps((p) => [...p, { description: "", isKeyStep: false }]);

  const removeStep = (i: number) =>
    setSteps((p) => p.filter((_, idx) => idx !== i));

  const updateStep = (i: number, field: keyof StepDraft, value: string | boolean) =>
    setSteps((p) => p.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  const set = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Task name is required"); return; }
    if (selectedProgrammes.length === 0) { toast.error("Please select at least one programme"); return; }
    if (selectedYearLevels.length === 0) { toast.error("Please select at least one year level"); return; }
    if (steps.filter((s) => s.description.trim()).length === 0) {
      toast.error("Add at least one step"); return;
    }
    mutation.mutate();
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/tasks">
          <Button variant="outline" size="icon" className="w-8 h-8" id="back-btn">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="page-title">Create New Task</h1>
          <p className="page-subtitle">Add a new practical assessment task to the bank</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Task Details
            </CardTitle>
            <CardDescription>Basic information about this assessment task</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-name">Task Name *</Label>
              <Input
                id="task-name"
                placeholder="e.g. Blood Pressure Measurement"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                placeholder="Brief description of what this task assesses..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="resize-none min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Programmes *</Label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {programmes?.map((p) => {
                    const isSelected = selectedProgrammes.includes(p.id);
                    return (
                      <Button
                        key={p.id}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className="h-9 px-3 text-xs"
                        onClick={() => {
                          setSelectedProgrammes((prev) =>
                            isSelected ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                          );
                          set("categoryId", "");
                        }}
                      >
                        {p.name}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Year Levels *</Label>
                <div className="flex gap-2 mt-1">
                  {[2, 3].map((yr) => {
                    const isSelected = selectedYearLevels.includes(yr);
                    return (
                      <Button
                        key={yr}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className="h-9 px-4 text-xs"
                        onClick={() =>
                          setSelectedYearLevels((prev) =>
                            isSelected ? prev.filter((y) => y !== yr) : [...prev, yr]
                          )
                        }
                      >
                        Year {yr}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-category">Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => set("categoryId", v ?? "")}
                disabled={selectedProgrammes.length === 0}
              >
                <SelectTrigger id="task-category">
                  <SelectValue placeholder={selectedProgrammes.length > 0 ? "Select category" : "Select programme first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Scoring config */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" /> Scoring Configuration
            </CardTitle>
            <CardDescription>Set the rating scale and scoring parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-scale">Rating Scale *</Label>
                <Select
                  value={form.ratingScale}
                  onValueChange={(v) => set("ratingScale", v ?? "SCALE_0_4")}
                  items={[
                    { label: "0–4 Scale (Excellent)", value: "SCALE_0_4" },
                    { label: "0–2 Scale (Satisfactory)", value: "SCALE_0_2" }
                  ]}
                >
                  <SelectTrigger id="task-scale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCALE_0_4">0–4 Scale (Excellent)</SelectItem>
                    <SelectItem value="SCALE_0_2">0–2 Scale (Satisfactory)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-maxscore">Max Score</Label>
                <Input
                  id="task-maxscore"
                  type="number"
                  min={0}
                  value={form.maxScore}
                  onChange={(e) => set("maxScore", parseInt(e.target.value) || 0)}
                />
                <p className="text-[11px] text-muted-foreground">0 = auto-calculated</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-sort">Sort Order</Label>
                <Input
                  id="task-sort"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)}
                />
                <p className="text-[11px] text-muted-foreground">Lower = appears first</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border bg-muted/40 p-4">
              <div>
                <p className="text-xs font-semibold text-foreground">0–4 Rating Scale</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  0 = Not done · 1 = Poor · 2 = Fair · 3 = Good · 4 = Excellent
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">0–2 Rating Scale</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  0 = Not done · 1 = Unsatisfactory · 2 = Satisfactory
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" /> Assessment Steps *
            </CardTitle>
            <CardDescription>
              Define the steps examiners will follow. Click ⭐ to mark a step as a key (critical) step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground mt-2.5">
                  {i + 1}
                </div>
                <Textarea
                  value={step.description}
                  onChange={(e) => updateStep(i, "description", e.target.value)}
                  placeholder={`Step ${i + 1} description...`}
                  className="flex-1 min-h-[60px] resize-none text-sm"
                  id={`step-${i + 1}`}
                />
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    type="button"
                    title={step.isKeyStep ? "Remove key step" : "Mark as key step"}
                    onClick={() => updateStep(i, "isKeyStep", !step.isKeyStep)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      step.isKeyStep
                        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600"
                        : "text-muted-foreground hover:text-amber-500 hover:bg-amber-50"
                    )}
                  >
                    <Star className="w-4 h-4" />
                  </button>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStep}
              className="w-full border-dashed mt-1"
              id="add-step-btn"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Step
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/admin/tasks">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button
            type="submit"
            className="gradient-primary border-0 text-white shadow-md hover:opacity-90"
            disabled={mutation.isPending}
            id="create-task-submit-btn"
          >
            {mutation.isPending ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </form>
    </div>
  );
}
