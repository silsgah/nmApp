"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { Stethoscope, Plus, Save, Trash2, Edit3, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Programme {
  id: string;
  name: string;
  fullName: string;
}

interface CarePlanType {
  id: string;
  name: string;
  maxMarks: number;
  sortOrder: number;
  programmeId: string;
}

export default function CarePlanAdminPage() {
  const queryClient = useQueryClient();
  const [selectedProg, setSelectedProg] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newMaxMarks, setNewMaxMarks] = useState("10");
  const [newSortOrder, setNewSortOrder] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch programmes
  const { data: programmes, isLoading: progsLoading } = useQuery<Programme[]>({
    queryKey: ["programmes"],
    queryFn: () => api.get("/programmes").then((r) => r.data),
  });

  // Fetch care plan types
  const { data: planTypes, isLoading: typesLoading } = useQuery<CarePlanType[]>({
    queryKey: ["care-plan-types", selectedProg],
    queryFn: () => api.get(`/care-plans/types?programmeId=${selectedProg}`).then((r) => r.data),
    enabled: !!selectedProg,
  });

  // Mutation to add
  const addMutation = useMutation({
    mutationFn: (data: any) => api.post("/care-plans/types", data),
    onSuccess: () => {
      toast.success("Care Plan type added successfully");
      setNewName("");
      setNewMaxMarks("10");
      setNewSortOrder("1");
      queryClient.invalidateQueries({ queryKey: ["care-plan-types"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to add Care Plan type");
    },
  });

  // Mutation to delete
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/care-plans/types/${id}`),
    onSuccess: () => {
      toast.success("Care Plan type deleted");
      queryClient.invalidateQueries({ queryKey: ["care-plan-types"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete Care Plan type");
    },
  });

  // Mutation to update
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/care-plans/types/${id}`, data),
    onSuccess: () => {
      toast.success("Care Plan type updated");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["care-plan-types"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update Care Plan type");
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !selectedProg) return;
    addMutation.mutate({
      name: newName,
      programmeId: selectedProg,
      maxMarks: parseFloat(newMaxMarks) || 10.0,
      sortOrder: parseInt(newSortOrder) || 0,
    });
  };

  const handleSaveEdit = (type: CarePlanType, field: string, val: string) => {
    const data: any = {};
    if (field === "name") data.name = val;
    if (field === "maxMarks") data.maxMarks = parseFloat(val) || 10.0;
    if (field === "sortOrder") data.sortOrder = parseInt(val) || 0;
    updateMutation.mutate({ id: type.id, data });
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-primary" />
          Care Plan Configuration
        </h1>
        <p className="page-subtitle">Configure Care Plan sub-types and marks allocations per programme</p>
      </div>

      <Card className="rounded-2xl border border-border/80 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Settings2 className="w-4.5 h-4.5 text-primary" />
            Programme Selection
          </CardTitle>
          <CardDescription className="text-xs">
            Select a nursing or midwifery programme to manage its Care Plan types.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Select value={selectedProg} onValueChange={(val) => setSelectedProg(val ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select programme..." />
              </SelectTrigger>
              <SelectContent>
                {programmes?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName} ({p.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedProg && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* List of existing Care Plan Types */}
          <div className="md:col-span-2 space-y-4">
            <Card className="rounded-2xl border border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Configured Care Plan Types</CardTitle>
                <CardDescription className="text-xs">
                  Active Care Plan modules evaluated by examiners.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {typesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 rounded-xl" />
                    <Skeleton className="h-10 rounded-xl" />
                  </div>
                ) : !planTypes || planTypes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm font-medium">
                    No Care Plan types configured for this programme yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {planTypes.map((type) => (
                      <div key={type.id} className="flex items-center justify-between p-3.5 rounded-xl border bg-card/60 gap-4">
                        <div className="flex-1 space-y-1">
                          {editingId === type.id ? (
                            <Input
                              value={type.name}
                              onChange={(e) => handleSaveEdit(type, "name", e.target.value)}
                              onBlur={() => setEditingId(null)}
                              autoFocus
                              className="h-8 text-sm"
                            />
                          ) : (
                            <p className="text-sm font-bold flex items-center gap-2">
                              {type.name}
                              <button onClick={() => setEditingId(type.id)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Max Marks: {type.maxMarks}</span>
                            <span>Order: {type.sortOrder}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Inline modifiers */}
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              value={type.maxMarks}
                              onChange={(e) => handleSaveEdit(type, "maxMarks", e.target.value)}
                              className="h-7 w-14 text-center text-xs"
                              title="Max Marks"
                            />
                            <Input
                              type="number"
                              value={type.sortOrder}
                              onChange={(e) => handleSaveEdit(type, "sortOrder", e.target.value)}
                              className="h-7 w-12 text-center text-xs"
                              title="Sort Order"
                            />
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-lg cursor-pointer"
                            onClick={() => deleteMutation.mutate(type.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add Form */}
          <div>
            <Card className="rounded-2xl border border-border/80 shadow-sm sticky top-6">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-primary" />
                  Add Care Plan Type
                </CardTitle>
                <CardDescription className="text-xs">
                  Create a new care plan sub-component.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="careplan-name" className="text-xs font-medium">Name</Label>
                    <Input
                      id="careplan-name"
                      placeholder="e.g. Surgery, Medicine"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="careplan-marks" className="text-xs font-medium">Max Marks</Label>
                      <Input
                        id="careplan-marks"
                        type="number"
                        min={1}
                        value={newMaxMarks}
                        onChange={(e) => setNewMaxMarks(e.target.value)}
                        required
                        className="h-9 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="careplan-order" className="text-xs font-medium">Sort Order</Label>
                      <Input
                        id="careplan-order"
                        type="number"
                        min={0}
                        value={newSortOrder}
                        onChange={(e) => setNewSortOrder(e.target.value)}
                        required
                        className="h-9 text-center"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={addMutation.isPending} className="w-full h-9 gap-1.5 mt-2">
                    <Plus className="w-4 h-4" />
                    {addMutation.isPending ? "Adding..." : "Add Sub-Type"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
