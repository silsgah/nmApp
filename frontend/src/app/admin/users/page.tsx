"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Users, Plus, Search, MoreHorizontal,
  UserCheck, UserX, Mail, Shield, GraduationCap,
  ChevronDown, Pencil, RefreshCw, Download,
  User, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  id: string; name: string; email: string; role: string;
  staffId: string | null; isActive: boolean; createdAt: string;
  programme: { id: string; name: string } | null;
}

const roleConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  ADMIN:    { label: "Admin",    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",       icon: Shield },
  EXAMINER: { label: "Examiner", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400", icon: UserCheck },
};

function CreateUserDialog({ programmes }: { programmes: { id: string; name: string; fullName: string }[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "EXAMINER", programmeId: "", staffId: "", password: "" });

  const mutation = useMutation({
    mutationFn: () => api.post("/users", form),
    onSuccess: () => {
      toast.success("User created successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setForm({ name: "", email: "", role: "EXAMINER", programmeId: "", staffId: "", password: "" });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? "Failed to create user");
    },
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gradient-primary border-0 text-white shadow-md hover:opacity-90" id="create-user-btn" type="button">
            <Plus className="w-4 h-4 mr-2" /> Add User
          </Button>
        }
      />
      <DialogContent className="max-w-md rounded-2xl border border-border/80 shadow-2xl p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold text-foreground">Create Staff Profile</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Add a new examiner or administrator to the portal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Full Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input id="new-name" placeholder="e.g. Abena Asante" value={form.name} onChange={(e) => set("name", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input id="new-email" type="email" placeholder="user@nmportal.edu.gh" value={form.email} onChange={(e) => set("email", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Role *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => set("role", v ?? "")}
                items={[
                  { label: "Examiner", value: "EXAMINER" },
                  { label: "Admin", value: "ADMIN" }
                ]}
              >
                <SelectTrigger id="new-role" className="h-9 bg-muted/20 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXAMINER">Examiner</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Programme (Optional)</Label>
              <Select
                value={form.programmeId}
                onValueChange={(v) => set("programmeId", v ?? "")}
                items={[
                  { label: "None", value: "" },
                  ...programmes.map((p) => ({ label: p.name, value: p.id }))
                ]}
              >
                <SelectTrigger id="new-programme" className="h-9 bg-muted/20 border-border/60">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {programmes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Staff ID / Rank</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input id="new-staff-id" placeholder="e.g. SNO-001" value={form.staffId} onChange={(e) => set("staffId", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input id="new-password" type="password" placeholder="Leave blank for NMPortal123!" value={form.password} onChange={(e) => set("password", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
            </div>
            <p className="text-[10px] text-muted-foreground/70">User will be prompted to change password on first login.</p>
          </div>
        </div>
        <DialogFooter className="pt-4 border-t border-border/60 flex items-center gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">Cancel</Button>
          <Button
            className="gradient-primary border-0 text-white hover:opacity-90 cursor-pointer px-5 shadow-sm"
            onClick={() => mutation.mutate()}
            disabled={!form.name || !form.email || mutation.isPending}
            id="create-user-submit-btn"
          >
            {mutation.isPending ? "Creating..." : "Save User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  programmes,
  onClose,
}: {
  user: User;
  programmes: { id: string; name: string; fullName: string }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    programmeId: user.programme?.id ?? "",
    staffId: user.staffId ?? "",
    password: "",
  });

  const mutation = useMutation({
    mutationFn: () => api.patch(`/users/${user.id}`, form),
    onSuccess: () => {
      toast.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? "Failed to update user");
    },
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl border border-border/80 shadow-2xl p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold text-foreground">Edit Staff Profile</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Modify staff details or change password for {user.name}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Full Name *</Label>
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
              <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Role *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => set("role", v ?? "")}
                items={[
                  { label: "Examiner", value: "EXAMINER" },
                  { label: "Admin", value: "ADMIN" }
                ]}
              >
                <SelectTrigger id="edit-role" className="h-9 bg-muted/20 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXAMINER">Examiner</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Programme</Label>
              <Select
                value={form.programmeId}
                onValueChange={(v) => set("programmeId", v ?? "")}
                items={[
                  { label: "None", value: "" },
                  ...programmes.map((p) => ({ label: p.name, value: p.id }))
                ]}
              >
                <SelectTrigger id="edit-programme" className="h-9 bg-muted/20 border-border/60">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {programmes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Staff ID / Rank</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input id="edit-staff-id" value={form.staffId} onChange={(e) => set("staffId", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">New Password (optional)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input id="edit-password" type="password" placeholder="Leave blank to keep current" value={form.password} onChange={(e) => set("password", e.target.value)} className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all" />
            </div>
          </div>
        </div>
        <DialogFooter className="pt-4 border-t border-border/60 flex items-center gap-2">
          <Button variant="outline" onClick={onClose} className="cursor-pointer">Cancel</Button>
          <Button
            className="gradient-primary border-0 text-white hover:opacity-90 cursor-pointer px-5 shadow-sm"
            onClick={() => mutation.mutate()}
            disabled={!form.name || !form.email || mutation.isPending}
            id="edit-user-submit-btn"
          >
            {mutation.isPending ? "Updating..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", search, roleFilter, page],
    queryFn: () => api.get("/users", {
      params: { search: search || undefined, role: roleFilter === "all" ? "EXAMINER,ADMIN" : roleFilter, page, limit: 20 },
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
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User status updated");
    },
  });

  const users: User[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">{total} registered examiners and administrators</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["users"] })}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <CreateUserDialog programmes={programmes ?? []} />
        </div>
      </div>

      {/* Role summary pills */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(roleConfig).map(([role, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={role}
                onClick={() => setRoleFilter(roleFilter === role ? "all" : role)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  roleFilter === role ? cfg.className + " ring-2 ring-offset-1 ring-current" : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                )}
                id={`role-filter-${role.toLowerCase()}`}
              >
                <Icon className="w-3 h-3" />
                {cfg.label}
              </button>
            );
          })}
          {roleFilter !== "all" && (
            <button
              onClick={() => setRoleFilter("all")}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"
            >
              Clear filter ×
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="user-search"
          placeholder="Search by name, email or staff ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9 h-9"
        />
      </div>

      {/* Table Section */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">User Details</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Email Address</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Index / Staff ID</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Role</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Programme</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right h-11">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i} className="hover:bg-muted/5">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="px-6 py-4 text-right"><Skeleton className="h-7 w-7 rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-muted-foreground font-medium">No users found</p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const cfg = roleConfig[user.role];
                const RoleIcon = cfg?.icon ?? Shield;
                return (
                  <TableRow
                    key={user.id}
                    className={cn(
                      "hover:bg-muted/20 transition-colors",
                      !user.isActive && "opacity-60 bg-muted/5"
                    )}
                    id={`user-row-${user.id}`}
                  >
                    {/* Name + Avatar */}
                    <TableCell className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 flex-shrink-0 shadow-sm border border-border">
                          <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-bold">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                          {!user.isActive && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 text-muted-foreground bg-muted border-border mt-0.5">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {user.email}
                    </TableCell>

                    {/* Staff ID */}
                    <TableCell className="px-6 py-3.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {user.staffId || "—"}
                    </TableCell>

                    {/* Role */}
                    <TableCell className="px-6 py-3.5 whitespace-nowrap">
                      <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border shadow-sm", cfg?.className)}>
                        <RoleIcon className="w-3 h-3" />
                        {cfg?.label}
                      </span>
                    </TableCell>

                    {/* Programme */}
                    <TableCell className="px-6 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {user.programme?.name ?? "—"}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-6 py-3.5 text-right whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" className="w-7 h-7 hover:bg-muted" id={`user-actions-${user.id}`}>
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="text-xs cursor-pointer"
                            onClick={() => setEditingUser(user)}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-xs cursor-pointer"
                            onClick={() => toggleActiveMutation.mutate({ id: user.id, isActive: !user.isActive })}
                          >
                            {user.isActive ? (
                              <><UserX className="w-3.5 h-3.5 mr-2 text-red-500" /> Deactivate</>
                            ) : (
                              <><UserCheck className="w-3.5 h-3.5 mr-2 text-green-500" /> Activate</>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Premium Pagination Footer */}
        {total > 0 && (
          <div className="px-6 py-4 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{Math.min((page - 1) * 20 + 1, total)}</span> to{" "}
              <span className="font-semibold text-foreground">{Math.min(page * 20, total)}</span> of{" "}
              <span className="font-semibold text-foreground">{total}</span> users
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
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setPage(page + 1)}
                disabled={page * 20 >= total}
              >
                Next
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setPage(Math.ceil(total / 20))}
                disabled={page * 20 >= total}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </div>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          programmes={programmes ?? []}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}
