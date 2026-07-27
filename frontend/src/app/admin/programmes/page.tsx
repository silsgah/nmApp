"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { GraduationCap, Plus, Save, Trash2, Edit3, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

interface Programme {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  _count?: {
    tasks: number;
    examSessions: number;
    users: number;
  };
}

export default function ProgrammesAdminPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch programmes
  const { data: programmes, isLoading } = useQuery<Programme[]>({
    queryKey: ["programmes"],
    queryFn: () => api.get("/programmes").then((r) => r.data),
  });

  // Mutation to add
  const addMutation = useMutation({
    mutationFn: (data: any) => api.post("/programmes", data),
    onSuccess: () => {
      toast.success("Programme created successfully");
      setNewName("");
      setNewFullName("");
      setNewDescription("");
      queryClient.invalidateQueries({ queryKey: ["programmes"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create programme");
    },
  });

  // Mutation to update
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/programmes/${id}`, data),
    onSuccess: () => {
      toast.success("Programme updated successfully");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["programmes"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update programme");
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newFullName) return;
    addMutation.mutate({
      name: newName.toUpperCase().trim(),
      fullName: newFullName.trim(),
      description: newDescription.trim(),
    });
  };

  const handleSaveEdit = (prog: Programme, field: string, val: string) => {
    const data: any = {};
    if (field === "name") data.name = val.toUpperCase().trim();
    if (field === "fullName") data.fullName = val.trim();
    if (field === "description") data.description = val.trim();
    updateMutation.mutate({ id: prog.id, data });
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" />
          Programmes Management
        </h1>
        <p className="page-subtitle">Manage GAFCONM nursing and midwifery academic programmes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* List of Programmes */}
        <div className="md:col-span-2 space-y-4">
          <Card className="rounded-2xl border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Configured Academic Programmes</CardTitle>
              <CardDescription className="text-xs">
                Active programmes available for user registrations, tasks and sessions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                </div>
              ) : !programmes || programmes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm font-medium">
                  No academic programmes created yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {programmes.map((prog) => (
                    <div key={prog.id} className="flex flex-col p-4 rounded-xl border bg-card/60 gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          {editingId === prog.id ? (
                            <div className="space-y-2">
                              <Input
                                value={prog.name}
                                onChange={(e) => handleSaveEdit(prog, "name", e.target.value)}
                                className="h-8 text-xs font-mono font-bold"
                                placeholder="Code (e.g. RGN)"
                              />
                              <Input
                                value={prog.fullName}
                                onChange={(e) => handleSaveEdit(prog, "fullName", e.target.value)}
                                className="h-8 text-sm font-semibold"
                                placeholder="Full Name"
                              />
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-bold flex items-center gap-2 text-foreground">
                                {prog.fullName}
                                <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">
                                  {prog.name}
                                </span>
                              </p>
                              {prog.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {prog.description}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                            onClick={() => setEditingId(editingId === prog.id ? null : prog.id)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Stat counters & description edit */}
                      <div className="flex items-center justify-between border-t pt-3 mt-1 flex-wrap gap-2 text-[10px] sm:text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span>{prog._count?.users ?? 0} Students/Staff</span>
                          <span>{prog._count?.tasks ?? 0} Tasks</span>
                          <span>{prog._count?.examSessions ?? 0} Sessions</span>
                        </div>
                      </div>

                      {editingId === prog.id && (
                        <div className="pt-2 border-t mt-1">
                          <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Description</Label>
                          <Textarea
                            value={prog.description || ""}
                            onChange={(e) => handleSaveEdit(prog, "description", e.target.value)}
                            className="text-xs mt-1 min-h-[60px]"
                            placeholder="Add programme description..."
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Programme Form */}
        <div>
          <Card className="rounded-2xl border border-border/80 shadow-sm sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary" />
                Add Programme
              </CardTitle>
              <CardDescription className="text-xs">
                Configure a new academic programme path.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="prog-code" className="text-xs font-medium">Programme Code</Label>
                  <Input
                    id="prog-code"
                    placeholder="e.g. RMN, RCN"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="h-9 font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="prog-name" className="text-xs font-medium">Programme Full Name</Label>
                  <Input
                    id="prog-name"
                    placeholder="e.g. Registered Mental Nurse"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="prog-desc" className="text-xs font-medium">Description</Label>
                  <Textarea
                    id="prog-desc"
                    placeholder="Provide overview of the academic programme..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="min-h-[80px] text-sm"
                  />
                </div>

                <Button type="submit" disabled={addMutation.isPending} className="w-full h-9 gap-1.5 mt-2">
                  <Plus className="w-4 h-4" />
                  {addMutation.isPending ? "Creating..." : "Create Programme"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
