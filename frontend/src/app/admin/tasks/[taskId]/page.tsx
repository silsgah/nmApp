"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft, BookOpen, CheckCircle2, Circle, Star,
  Pencil, Save, X, Plus, Trash2, ToggleLeft, ToggleRight, Hash, GripVertical, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface TaskStep {
  id: string;
  stepNumber: number;
  description: string;
  isKeyStep: boolean;
}

interface Task {
  id: string;
  name: string;
  description: string | null;
  ratingScale: string;
  maxScore: number;
  isActive: boolean;
  programmes: { programme: { id: string; name: string; fullName: string } }[];
  yearLevels: { yearLevel: number }[];
  category: { id: string; name: string } | null;
  steps: TaskStep[];
}

const scaleInfo: Record<string, { label: string; description: string; className: string }> = {
  SCALE_0_4: {
    label: "0–4 Rating Scale",
    description: "Examiner rates each step from 0 (not performed) to 4 (excellent)",
    className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  SCALE_0_2: {
    label: "0–2 Rating Scale",
    description: "Examiner rates each step from 0 (not performed) to 2 (satisfactory)",
    className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  },
};

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingSteps, setEditingSteps] = useState(false);
  const [localSteps, setLocalSteps] = useState<Omit<TaskStep, "id">[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["task", taskId],
    queryFn: () => api.get(`/tasks/${taskId}`).then((r) => r.data),
    enabled: !!taskId,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (isActive: boolean) => api.patch(`/tasks/${taskId}`, { isActive }),
    onSuccess: () => {
      toast.success("Task status updated");
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const saveStepsMutation = useMutation({
    mutationFn: (steps: Omit<TaskStep, "id">[]) => api.put(`/tasks/${taskId}/steps`, { steps }),
    onSuccess: () => {
      toast.success("Steps saved successfully");
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      setEditingSteps(false);
    },
    onError: () => toast.error("Failed to save steps"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      toast.success("Task deleted successfully");
      router.push("/admin/tasks");
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error || "Failed to delete task";
      toast.error(errMsg);
    },
  });

  const startEditing = () => {
    setLocalSteps(
      task?.steps.map((s) => ({
        stepNumber: s.stepNumber,
        description: s.description,
        isKeyStep: s.isKeyStep,
      })) ?? []
    );
    setEditingSteps(true);
  };

  const addStep = () =>
    setLocalSteps((prev) => [...prev, { stepNumber: prev.length + 1, description: "", isKeyStep: false }]);

  const removeStep = (index: number) =>
    setLocalSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 }))
    );

  const updateStep = (index: number, field: keyof Omit<TaskStep, "id">, value: string | number | boolean) =>
    setLocalSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));

  const moveStep = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setLocalSteps((previous) => {
      const reordered = [...previous];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return reordered.map((step, index) => ({ ...step, stepNumber: index + 1 }));
    });
    setDraggedStepIndex(toIndex);
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto text-center py-20">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
        <p className="text-lg font-semibold text-foreground">Task not found</p>
        <p className="text-muted-foreground text-sm mt-1">This task may have been removed.</p>
        <Link href="/admin/tasks">
          <Button variant="outline" className="mt-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Task Bank
          </Button>
        </Link>
      </div>
    );
  }

  const scale = scaleInfo[task.ratingScale];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/tasks">
          <Button variant="outline" size="icon" className="w-8 h-8 mt-0.5 flex-shrink-0" id="back-btn">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title truncate">{task.name}</h1>
            {!task.isActive && (
              <Badge variant="outline" className="text-muted-foreground text-xs flex-shrink-0">Inactive</Badge>
            )}
          </div>
          <p className="page-subtitle mt-1">
            {task.programmes?.map((p) => p.programme.name).join(", ") || "No programmes"}
            {task.yearLevels && task.yearLevels.length > 0 && (
              <> · Years: {task.yearLevels.map((yl) => yl.yearLevel).join(", ")}</>
            )}
            {task.category && <> · {task.category.name}</>}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "flex-shrink-0",
              task.isActive
                ? "text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
            )}
            onClick={() => toggleActiveMutation.mutate(!task.isActive)}
            disabled={toggleActiveMutation.isPending}
            id="toggle-active-btn"
          >
            {task.isActive ? (
              <><ToggleLeft className="w-4 h-4 mr-2" />Deactivate</>
            ) : (
              <><ToggleRight className="w-4 h-4 mr-2" />Activate</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 flex-shrink-0"
            onClick={() => setDeleteConfirmOpen(true)}
            id="delete-task-btn"
          >
            <Trash2 className="w-4 h-4 mr-2" />Delete Task
          </Button>
        </div>
      </div>

      {/* Overview card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> Task Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-xl px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Rating Scale</p>
              <span className={cn("inline-block mt-1.5 text-xs font-semibold px-2.5 py-1 rounded-full", scale?.className)}>
                {scale?.label ?? task.ratingScale}
              </span>
            </div>
            <div className="bg-muted/50 rounded-xl px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Max Score</p>
              <p className="text-xl font-bold text-foreground mt-1">{task.maxScore}</p>
            </div>
            <div className="bg-muted/50 rounded-xl px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Steps</p>
              <p className="text-xl font-bold text-foreground mt-1">{task.steps.length}</p>
            </div>
            <div className="bg-muted/50 rounded-xl px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Key Steps</p>
              <p className="text-xl font-bold text-foreground mt-1">{task.steps.filter((s) => s.isKeyStep).length}</p>
            </div>
          </div>

          {task.description && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-sm text-foreground leading-relaxed">{task.description}</p>
              </div>
            </>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3">
            <Hash className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">{scale?.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Steps card */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div className="space-y-1 text-xs leading-relaxed">
          <p className="font-bold">Practical task policy</p>
          <p>One Major task has full weight. Two different Minor tasks have half weight each. Examiner scores are averaged within each task before the two Minor results are combined. A student cannot repeat the same task in one examination session.</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Assessment Steps
            </CardTitle>
            <CardDescription className="mt-1">
              Steps examiners follow when assessing this task. ⭐ marks key steps. While editing, drag the handle to change their order.
            </CardDescription>
          </div>
          {!editingSteps ? (
            <Button variant="outline" size="sm" onClick={startEditing} id="edit-steps-btn">
              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Steps
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingSteps(false)}>
                <X className="w-3.5 h-3.5 mr-2" /> Cancel
              </Button>
              <Button
                size="sm"
                className="gradient-primary border-0 text-white hover:opacity-90"
                onClick={() => saveStepsMutation.mutate(localSteps)}
                disabled={saveStepsMutation.isPending}
                id="save-steps-btn"
              >
                <Save className="w-3.5 h-3.5 mr-2" />
                {saveStepsMutation.isPending ? "Saving..." : "Save Steps"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!editingSteps ? (
            <div className="space-y-1.5">
              {task.steps.length === 0 ? (
                <div className="text-center py-10">
                  <Circle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">No steps defined yet</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={startEditing}>
                    <Plus className="w-3.5 h-3.5 mr-2" /> Add Steps
                  </Button>
                </div>
              ) : (
                task.steps.map((step) => (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg px-4 py-3",
                      step.isKeyStep
                        ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                        : "bg-muted/40"
                    )}
                    id={`step-${step.stepNumber}`}
                  >
                    <div className={cn(
                      "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5",
                      step.isKeyStep
                        ? "bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {step.stepNumber}
                    </div>
                    <p className="flex-1 text-sm text-foreground leading-relaxed">{step.description}</p>
                    {step.isKeyStep && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {localSteps.map((step, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => setDraggedStepIndex(i)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggedStepIndex !== null) moveStep(draggedStepIndex, i);
                  }}
                  onDragEnd={() => setDraggedStepIndex(null)}
                  className={cn("flex items-start gap-2 rounded-lg border border-transparent p-1 transition-colors", draggedStepIndex === i && "border-primary/30 bg-primary/5")}
                >
                  <button type="button" className="mt-2.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing" title="Drag to reorder" aria-label={`Drag step ${i + 1} to reorder`}>
                    <GripVertical className="h-5 w-5" />
                  </button>
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground mt-2.5">
                    {i + 1}
                  </div>
                  <Textarea
                    value={step.description}
                    onChange={(e) => updateStep(i, "description", e.target.value)}
                    placeholder={`Step ${i + 1} description...`}
                    className="flex-1 min-h-[60px] resize-none text-sm"
                    id={`step-input-${i + 1}`}
                  />
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => updateStep(i, "isKeyStep", !step.isKeyStep)}
                      title={step.isKeyStep ? "Remove key step" : "Mark as key step"}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        step.isKeyStep
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground hover:text-amber-500 hover:bg-amber-50"
                      )}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStep}
                className="w-full border-dashed mt-2"
                id="add-step-btn"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Step
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the task <strong>{task.name}</strong> and all its associated assessment steps. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              id="confirm-delete-task-btn"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
