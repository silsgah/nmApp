"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  GraduationCap, Plus, Search, MoreHorizontal,
  UserCheck, UserX, Mail, Shield, Camera,
  ChevronDown, Pencil, RefreshCw, Upload, Trash2,
  User, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Student {
  id: string;
  name: string;
  email: string;
  role: string;
  staffId: string | null; // Student Index / Candidate Number
  isActive: boolean;
  profilePictureUrl: string | null;
  createdAt: string;
  programme: { id: string; name: string } | null;
}

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

function StudentPhotoUpload({
  value,
  onChange,
  name,
}: {
  value: string | null;
  onChange: (base64: string | null) => void;
  name: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file size should be less than 2MB");
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      onChange(base64);
    } catch {
      toast.error("Failed to read image file");
    }
  };

  const getInitials = (n: string) =>
    n.split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex items-center gap-5 bg-muted/20 p-4 rounded-2xl border border-border/50 shadow-sm">
      <div className="relative group flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-teal-500/20 rounded-full blur-[2px] -z-10 group-hover:blur-[4px] transition-all" />
        <Avatar className="w-16 h-16 border-2 border-background shadow-md transition-all group-hover:scale-[1.02] flex-shrink-0">
          <AvatarImage src={value || undefined} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary text-base font-bold">
            {getInitials(name || "Student")}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-foreground">Candidate Photograph</h4>
        <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, or WebP. Max size 2MB.</p>
        <div className="flex items-center gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 px-3 text-[11px] font-semibold border-border hover:bg-muted cursor-pointer"
          >
            <Upload className="w-3 h-3 mr-1.5 text-muted-foreground" /> Choose Image
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50/50 h-7 px-2.5 text-[11px] font-semibold cursor-pointer"
            >
              <Trash2 className="w-3 h-3 mr-1.5" /> Remove
            </Button>
          )}
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}

function CreateStudentDialog({ programmes }: { programmes: { id: string; name: string; fullName: string }[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", indexNumber: "", programmeId: "", password: "" });

  const mutation = useMutation({
    mutationFn: () => api.post("/users", {
      name: form.name,
      email: form.email,
      role: "STUDENT",
      programmeId: form.programmeId || null,
      staffId: form.indexNumber || null,
      profilePictureUrl: photo,
      password: form.password,
    }),
    onSuccess: () => {
      toast.success("Student created successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setOpen(false);
      setForm({ name: "", email: "", indexNumber: "", programmeId: "", password: "" });
      setPhoto(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? "Failed to create student");
    },
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gradient-primary border-0 text-white shadow-md hover:opacity-90 cursor-pointer" id="create-student-btn" type="button">
            <Plus className="w-4 h-4 mr-2" /> Add Student
          </Button>
        }
      />
      <DialogContent className="max-w-md rounded-2xl border border-border/80 shadow-2xl p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold text-foreground">Create Student Profile</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Add a new student candidate to the portal database.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <StudentPhotoUpload value={photo} onChange={setPhoto} name={form.name} />

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Student Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input id="new-name" placeholder="e.g. Ama Serwaah" value={form.name} onChange={(e) => set("name", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input id="new-email" type="email" placeholder="student@student.edu.gh" value={form.email} onChange={(e) => set("email", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Index / Candidate ID *</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input id="new-index" placeholder="e.g. RM-0932" value={form.indexNumber} onChange={(e) => set("indexNumber", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Programme *</Label>
                <Select
                  value={form.programmeId}
                  onValueChange={(v) => set("programmeId", v ?? "")}
                  items={programmes.map((p) => ({ label: p.name, value: p.id }))}
                >
                  <SelectTrigger id="new-programme" className="h-9 bg-muted/20 border-border/60">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {programmes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Default Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input id="new-password" type="password" placeholder="Leave blank for NMPortal123!" value={form.password} onChange={(e) => set("password", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
              </div>
              <p className="text-[10px] text-muted-foreground/70">Candidate will be prompted to change password on first login.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border/60 flex items-center gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">Cancel</Button>
          <Button
            className="gradient-primary border-0 text-white hover:opacity-90 cursor-pointer px-5 shadow-sm"
            onClick={() => mutation.mutate()}
            disabled={!form.name || !form.email || !form.programmeId || mutation.isPending}
            id="create-student-submit"
          >
            {mutation.isPending ? "Creating..." : "Save Student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditStudentDialog({
  student,
  programmes,
  onClose,
}: {
  student: Student;
  programmes: { id: string; name: string; fullName: string }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<string | null>(student.profilePictureUrl);
  const [form, setForm] = useState({
    name: student.name,
    email: student.email,
    indexNumber: student.staffId ?? "",
    programmeId: student.programme?.id ?? "",
    password: "",
  });

  const mutation = useMutation({
    mutationFn: () => api.patch(`/users/${student.id}`, {
      name: form.name,
      email: form.email,
      programmeId: form.programmeId || null,
      staffId: form.indexNumber || null,
      profilePictureUrl: photo,
      password: form.password || undefined,
    }),
    onSuccess: () => {
      toast.success("Student profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? "Failed to update student profile");
    },
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl border border-border/80 shadow-2xl p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold text-foreground">Edit Student Profile</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Modify profile details or change photo for {student.name}.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <StudentPhotoUpload value={photo} onChange={setPhoto} name={form.name} />

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Student Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input id="edit-name" value={form.name} onChange={(e) => set("name", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input id="edit-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Index / Candidate ID *</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input id="edit-index" value={form.indexNumber} onChange={(e) => set("indexNumber", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Programme *</Label>
                <Select
                  value={form.programmeId}
                  onValueChange={(v) => set("programmeId", v ?? "")}
                  items={programmes.map((p) => ({ label: p.name, value: p.id }))}
                >
                  <SelectTrigger id="edit-programme" className="h-9 bg-muted/20 border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {programmes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Change Password (optional)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input id="edit-password" type="password" placeholder="Leave blank to keep current" value={form.password} onChange={(e) => set("password", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border/60 flex items-center gap-2">
          <Button variant="outline" onClick={onClose} className="cursor-pointer">Cancel</Button>
          <Button
            className="gradient-primary border-0 text-white hover:opacity-90 cursor-pointer px-5 shadow-sm"
            onClick={() => mutation.mutate()}
            disabled={!form.name || !form.email || !form.programmeId || mutation.isPending}
            id="edit-student-submit"
          >
            {mutation.isPending ? "Updating..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["students", search, programmeFilter, page],
    queryFn: () => api.get("/users", {
      params: {
        search: search || undefined,
        role: "STUDENT",
        programmeId: programmeFilter === "all" ? undefined : programmeFilter,
        page,
        limit: 15
      },
    }).then((r) => r.data),
  });

  const { data: programmes } = useQuery({
    queryKey: ["programmes"],
    queryFn: () => api.get("/programmes").then((r) => r.data),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/users/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student account status updated");
    },
  });

  const students: Student[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary" />
            Student Management
          </h1>
          <p className="page-subtitle">{total} registered candidate students</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["students"] })} className="cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <CreateStudentDialog programmes={programmes ?? []} />
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="student-search"
            placeholder="Search student by name, email or index number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={programmeFilter}
            onValueChange={(v) => { setProgrammeFilter(v ?? "all"); setPage(1); }}
            items={[
              { label: "All Programmes", value: "all" },
              ...(programmes ?? []).map((p: any) => ({ label: p.name, value: p.id }))
            ]}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Programmes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programmes</SelectItem>
              {(programmes ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid Roster */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Candidate Image</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Full Name</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Index Number</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Programme</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Email Address</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right h-11">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i} className="hover:bg-muted/5">
                  <TableCell className="px-6 py-4"><Skeleton className="w-10 h-10 rounded-full" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="px-6 py-4 text-right"><Skeleton className="h-7 w-7 rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-muted-foreground font-medium">No students found matching filters</p>
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow
                  key={student.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors",
                    !student.isActive && "opacity-60 bg-muted/5"
                  )}
                >
                  {/* Photo / Avatar */}
                  <TableCell className="px-6 py-3 whitespace-nowrap">
                    <Avatar className="w-10 h-10 shadow-sm border border-border">
                      <AvatarImage src={student.profilePictureUrl || undefined} className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary text-[12px] font-bold">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>

                  {/* Name */}
                  <TableCell className="px-6 py-3 whitespace-nowrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{student.name}</p>
                      {!student.isActive && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 text-muted-foreground bg-muted border-border mt-0.5">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Index Number */}
                  <TableCell className="px-6 py-3 text-sm font-mono text-muted-foreground whitespace-nowrap">
                    {student.staffId || "—"}
                  </TableCell>

                  {/* Programme */}
                  <TableCell className="px-6 py-3 whitespace-nowrap">
                    <Badge variant="secondary" className="bg-teal-50 text-teal-700 hover:bg-teal-50 border border-teal-200 text-xs shadow-sm font-medium">
                      {student.programme?.name ?? "—"}
                    </Badge>
                  </TableCell>

                  {/* Email */}
                  <TableCell className="px-6 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {student.email}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="px-6 py-3 text-right whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="w-7 h-7 hover:bg-muted cursor-pointer">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          className="text-xs cursor-pointer"
                          onClick={() => setEditingStudent(student)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-xs cursor-pointer"
                          onClick={() => toggleActiveMutation.mutate({ id: student.id, isActive: !student.isActive })}
                        >
                          {student.isActive ? (
                            <><UserX className="w-3.5 h-3.5 mr-2 text-red-500" /> Deactivate</>
                          ) : (
                            <><UserCheck className="w-3.5 h-3.5 mr-2 text-green-500" /> Activate</>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {total > 0 && (
          <div className="px-6 py-4 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{Math.min((page - 1) * 15 + 1, total)}</span> to{" "}
              <span className="font-semibold text-foreground">{Math.min(page * 15, total)}</span> of{" "}
              <span className="font-semibold text-foreground">{total}</span> candidates
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                First
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <span className="text-xs font-semibold text-foreground bg-muted border border-border px-3 py-1.5 rounded-lg mx-1">
                Page {page} of {Math.ceil(total / 15)}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setPage(page + 1)}
                disabled={page * 15 >= total}
              >
                Next
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setPage(Math.ceil(total / 15))}
                disabled={page * 15 >= total}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </div>

      {editingStudent && (
        <EditStudentDialog
          student={editingStudent}
          programmes={programmes ?? []}
          onClose={() => setEditingStudent(null)}
        />
      )}
    </div>
  );
}
