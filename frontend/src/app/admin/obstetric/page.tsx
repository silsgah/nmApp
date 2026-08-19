"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Programme { id: string; name: string; fullName: string }
interface Option { id: string; name: string; parentId: string | null; maxMarks: number; children: Option[] }

export default function ObstetricSetupPage() {
  const queryClient = useQueryClient();
  const [programmeId, setProgrammeId] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("root");
  const [maxMarks, setMaxMarks] = useState(15);
  const { data: programmes = [] } = useQuery<Programme[]>({ queryKey: ["programmes"], queryFn: () => api.get("/programmes").then((r) => r.data) });
  const { data: options = [] } = useQuery<Option[]>({ queryKey: ["obstetric-options-admin", programmeId], queryFn: () => api.get(`/obstetric/options?programmeId=${programmeId}`).then((r) => r.data), enabled: !!programmeId });
  const roots = options.filter((option) => !option.parentId);
  const create = useMutation({
    mutationFn: () => api.post("/obstetric/options", { name, programmeId, parentId: parentId === "root" ? null : parentId, maxMarks }),
    onSuccess: () => { toast.success("Obstetric option added"); setName(""); queryClient.invalidateQueries({ queryKey: ["obstetric-options-admin", programmeId] }); },
    onError: (error: { response?: { data?: { error?: string; message?: string } } }) => toast.error(error.response?.data?.message || error.response?.data?.error || "Unable to add option"),
  });
  return <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
    <div><h1 className="page-title">Obstetric Examination Setup</h1><p className="page-subtitle">Configure the first dropdown and its dependent second-dropdown procedures.</p></div>
    <Card><CardHeader><CardTitle>Option bank</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="space-y-2"><Label>Programme</Label><Select value={programmeId} items={programmes.map((programme) => ({ value: programme.id, label: `${programme.name} — ${programme.fullName}` }))} onValueChange={(value) => { setProgrammeId(value || ""); setParentId("root"); }}><SelectTrigger><SelectValue placeholder="Select programme" /></SelectTrigger><SelectContent>{programmes.map((programme) => <SelectItem key={programme.id} value={programme.id}>{programme.name} — {programme.fullName}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-2"><Label>Parent option</Label><Select value={parentId} items={[{ value: "root", label: "First-dropdown option" }, ...roots.map((option) => ({ value: option.id, label: `Child of: ${option.name}` }))]} onValueChange={(value) => setParentId(value || "root")} disabled={!programmeId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="root">First-dropdown option</SelectItem>{roots.map((option) => <SelectItem key={option.id} value={option.id}>Child of: {option.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Option name</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div className="space-y-2"><Label>Maximum marks</Label><Input type="number" min={1} value={maxMarks} onChange={(event) => setMaxMarks(Number(event.target.value))} /></div>
      </div>
      <Button disabled={!programmeId || !name.trim() || create.isPending} onClick={() => create.mutate()}>Add option</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Configured choices</CardTitle></CardHeader><CardContent className="space-y-3">{roots.map((root) => <div key={root.id} className="rounded-lg border p-4"><p className="font-semibold">{root.name} <span className="text-xs text-muted-foreground">({root.maxMarks} marks)</span></p><div className="mt-2 pl-4 space-y-1">{root.children?.map((child) => <p key={child.id} className="text-sm text-muted-foreground">↳ {child.name} ({child.maxMarks})</p>)}{!root.children?.length && <p className="text-xs text-amber-700">No dependent options yet</p>}</div></div>)}{programmeId && !roots.length && <p className="text-sm text-muted-foreground">No choices configured.</p>}</CardContent></Card>
  </div>;
}
