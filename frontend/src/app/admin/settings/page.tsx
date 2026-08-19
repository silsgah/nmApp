"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { AxiosError } from "axios";
import { toast } from "sonner";
import {
  Settings2, Layers, Info, Plus,
  Save, Trash2, Camera, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Programme { id: string; name: string; fullName: string }
interface Category { id: string; name: string; weight: number; scaledMaxMarks: number; minPassScore: number; sortOrder: number; programmeId: string; _count?: { tasks: number } }
const apiError = (error: unknown, fallback: string) => (error as AxiosError<{ error?: string }>)?.response?.data?.error || fallback;

function CategoryRow({
  cat, onUpdate, onDelete,
}: {
  cat: Category;
  onUpdate: (id: string, data: Partial<Category>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-[1.2fr_130px_110px_40px] gap-3 items-center py-2">
      <div>
        <p className="text-sm font-medium text-foreground">{cat.name}</p>
      </div>
      <div>
        <Input
          type="number"
          min={0}
          max={200}
          value={cat.scaledMaxMarks ?? 80}
          onChange={(e) => onUpdate(cat.id, { scaledMaxMarks: parseInt(e.target.value) || 0 })}
          className="h-8 text-sm text-center"
          title="Contribution marks for each completed task"
        />
      </div>
      <div>
        <Input
          type="number"
          min={0}
          max={100}
          value={cat.minPassScore}
          onChange={(e) => onUpdate(cat.id, { minPassScore: parseInt(e.target.value) || 0 })}
          className="h-8 text-sm text-center"
          title="Min pass %"
        />
      </div>
      <button
        onClick={() => onDelete(cat.id)}
        className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
        title={cat._count?.tasks ? "Categories used by tasks cannot be removed" : "Remove category"}
        disabled={Boolean(cat._count?.tasks)}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, token, setAuth } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"system" | "profile">("system");

  // System settings state
  const [selectedProg, setSelectedProg] = useState<string>("");
  const [localCats, setLocalCats] = useState<Category[]>([]);
  const [catsDirty, setCatsDirty] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryMarks, setNewCategoryMarks] = useState("80");
  const [newCategoryPass, setNewCategoryPass] = useState("50");

  // Profile settings state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data: programmes } = useQuery<Programme[]>({
    queryKey: ["programmes"],
    queryFn: () => api.get("/programmes").then((r) => r.data),
  });

  const { data: categories, isLoading: catsLoading } = useQuery<Category[]>({
    queryKey: ["categories", selectedProg],
    queryFn: () => api.get(`/categories?programmeId=${selectedProg}`).then((r) => r.data),
    enabled: !!selectedProg,
  });

  useEffect(() => {
    if (categories) {
      // The editable copy intentionally resets when the selected programme query changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalCats(categories);
      setCatsDirty(false);
    }
  }, [categories]);

  const saveCatsMutation = useMutation({
    mutationFn: () => Promise.all(
      localCats.map((c) => api.patch(`/categories/${c.id}`, {
        scaledMaxMarks: c.scaledMaxMarks,
        minPassScore: c.minPassScore,
      }))
    ),
    onSuccess: () => {
      toast.success("Category settings saved");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setCatsDirty(false);
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const addCategoryMutation = useMutation({
    mutationFn: () => api.post("/categories", {
      name: newCategoryName.trim(), programmeId: selectedProg,
      scaledMaxMarks: Number(newCategoryMarks), minPassScore: Number(newCategoryPass),
      weight: 1, sortOrder: localCats.length,
    }),
    onSuccess: () => {
      toast.success("Practical category added");
      setNewCategoryName(""); setNewCategoryMarks("80"); setNewCategoryPass("50");
      queryClient.invalidateQueries({ queryKey: ["categories", selectedProg] });
    },
    onError: (error: unknown) => toast.error(apiError(error, "Unable to add category")),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => { toast.success("Category removed"); queryClient.invalidateQueries({ queryKey: ["categories", selectedProg] }); },
    onError: (error: unknown) => toast.error(apiError(error, "This category cannot be removed")),
  });

  const updateCat = (id: string, data: Partial<Category>) => {
    setLocalCats((cats) => cats.map((c) => c.id === id ? { ...c, ...data } : c));
    setCatsDirty(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file size must be less than 2MB");
      return;
    }

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const res = await api.patch("/users/profile", { profilePictureUrl: base64String });
        if (user) {
          setAuth({ ...user, profilePictureUrl: res.data.profilePictureUrl }, token || "");
        }
        toast.success("Profile photo updated successfully");
      } catch (err: unknown) {
        toast.error(apiError(err, "Failed to update profile photo"));
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    try {
      setUploadingPhoto(true);
      await api.patch("/users/profile", { profilePictureUrl: null });
      if (user) {
        setAuth({ ...user, profilePictureUrl: null }, token || "");
      }
      toast.success("Profile photo removed successfully");
    } catch (err: unknown) {
      toast.error(apiError(err, "Failed to remove profile photo"));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await api.patch("/users/profile", { password });
      toast.success("Password changed successfully");
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      toast.error(apiError(err, "Failed to update password"));
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "AD";

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title text-xl font-bold tracking-tight">Portal Settings</h1>
        <p className="page-subtitle text-xs text-muted-foreground mt-0.5">Configure GAFCONM exam configurations and manage your profile details</p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border/60 gap-4 mb-6">
        <button
          onClick={() => setActiveTab("system")}
          className={cn(
            "pb-2.5 text-sm font-semibold border-b-2 transition-all px-1 cursor-pointer",
            activeTab === "system"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          System Configuration
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={cn(
            "pb-2.5 text-sm font-semibold border-b-2 transition-all px-1 cursor-pointer",
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          My Profile Settings
        </button>
      </div>

      {activeTab === "system" ? (
        <div className="space-y-6">
          {/* Assessment Categories */}
          <Card className="rounded-2xl border border-border/80 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Assessment Category Configuration
              </CardTitle>
              <CardDescription className="text-xs">
                Configure practical categories for each programme. Contribution marks apply to each completed task:
                for example, one 80-mark Major or two 40-mark Minor tasks both contribute 80 practical marks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Programme selector */}
              <div className="max-w-sm">
                <Label htmlFor="settings-programme" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select Programme
                </Label>
                <Select
                  value={selectedProg}
                  onValueChange={(v) => setSelectedProg(v ?? "")}
                  items={programmes?.map((p) => ({ label: `${p.name} — ${p.fullName}`, value: p.id }))}
                >
                  <SelectTrigger id="settings-programme" className="h-9 mt-1.5">
                    <SelectValue placeholder="Choose a programme..." />
                  </SelectTrigger>
                  <SelectContent>
                    {programmes?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — {p.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProg && (
                <>
                  {/* Column headers */}
                  <div className="grid grid-cols-[1.2fr_130px_110px_40px] gap-3 pb-1 border-b">
                    <p className="text-xs font-semibold text-muted-foreground">Category</p>
                    <p className="text-xs font-semibold text-muted-foreground text-center">Marks per task</p>
                    <p className="text-xs font-semibold text-muted-foreground text-center">Min Pass %</p>
                    <span />
                  </div>

                  {/* Category rows */}
                  {catsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {localCats.map((cat) => (
                        <CategoryRow
                          key={cat.id}
                          cat={cat}
                          onUpdate={updateCat}
                          onDelete={(id) => deleteCategoryMutation.mutate(id)}
                        />
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
                    <p className="text-xs font-semibold">Add a practical category for this programme</p>
                    <div className="grid gap-2 sm:grid-cols-[1fr_130px_110px_auto]">
                      <Input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="e.g. Major or Minor" />
                      <Input type="number" min="1" max="200" value={newCategoryMarks} onChange={(event) => setNewCategoryMarks(event.target.value)} placeholder="Marks per task" />
                      <Input type="number" min="0" max="100" value={newCategoryPass} onChange={(event) => setNewCategoryPass(event.target.value)} placeholder="Pass %" />
                      <Button variant="outline" disabled={!newCategoryName.trim() || Number(newCategoryMarks) <= 0 || addCategoryMutation.isPending} onClick={() => addCategoryMutation.mutate()}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div className="space-y-1">
                      <p><strong>Practical calculation:</strong> examiner scores are averaged for each task, converted to a percentage, then multiplied by that category&apos;s marks per task.</p>
                      <p>One 80-mark Major and two 40-mark Minor tasks have equal possible marks. The practical overall is earned contribution marks ÷ possible contribution marks.</p>
                      <p><strong>Independent examinations:</strong> Care Plan, Case Study and Obstetric results are graded separately and never alter this practical overall.</p>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end pt-1">
                    <Button
                      className="gradient-primary border-0 text-white hover:opacity-90 cursor-pointer h-9 px-5 shadow-sm"
                      onClick={() => saveCatsMutation.mutate()}
                      disabled={!catsDirty || saveCatsMutation.isPending}
                      id="save-categories-btn"
                    >
                      <Save className="w-3.5 h-3.5 mr-2" />
                      {saveCatsMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Grading Scale Reference */}
          <Card className="rounded-2xl border border-border/80 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                Grading Scale Reference
              </CardTitle>
              <CardDescription className="text-xs">Standard grade boundaries applied by the grading engine</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-xl border overflow-hidden">
                {[
                  { grade: "A",    label: "Distinction",   range: "≥ 80%",     color: "bg-emerald-50 dark:bg-emerald-900/20" },
                  { grade: "B",    label: "Credit",        range: "70% – 79%", color: "bg-blue-50 dark:bg-blue-900/20" },
                  { grade: "C",    label: "Pass",          range: "60% – 69%", color: "bg-indigo-50 dark:bg-indigo-900/20" },
                  { grade: "D",    label: "Borderline",    range: "50% – 59%", color: "bg-amber-50 dark:bg-amber-900/20" },
                  { grade: "FAIL", label: "Fail",          range: "< 50%",     color: "bg-red-50 dark:bg-red-900/20" },
                ].map(({ grade, label, range, color }) => (
                  <div key={grade} className={cn("flex items-center justify-between px-4 py-2.5", color)}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black w-10 text-foreground">{grade}</span>
                      <span className="text-sm text-foreground">{label}</span>
                    </div>
                    <span className="text-sm font-mono text-muted-foreground">{range}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Overall pass threshold (default 50%) is set per-session. A student must also pass all mandatory categories.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Admin Photo Section */}
          <Card className="rounded-2xl border border-border/80 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" /> Profile Photograph
              </CardTitle>
              <CardDescription className="text-xs">
                Upload a professional passport picture for your administrator profile card.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl border border-border/50 bg-muted/20">
                <Avatar className="w-24 h-24 border-2 border-primary/20 shadow-md flex-shrink-0 bg-background">
                  {user?.profilePictureUrl ? (
                    <img src={user.profilePictureUrl} className="w-full h-full object-cover rounded-full" alt="Profile" />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold flex items-center justify-center">
                      {initials}
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploadingPhoto}
                      className="relative cursor-pointer h-8 text-xs font-semibold px-3"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploadingPhoto}
                      />
                      Choose Image
                    </Button>
                    {user?.profilePictureUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePhoto}
                        disabled={uploadingPhoto}
                        className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50/50 cursor-pointer px-3"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">
                    {uploadingPhoto ? "Uploading photo..." : "Format: JPG or PNG (Max 2MB)."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Password Section */}
          <Card className="rounded-2xl border border-border/80 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Update Password
              </CardTitle>
              <CardDescription className="text-xs">
                Secure your administrator account credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={savingPassword || !password}
                    className="gradient-primary border-0 text-white hover:opacity-90 cursor-pointer h-9 px-5 shadow-sm"
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    {savingPassword ? "Saving..." : "Change Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
