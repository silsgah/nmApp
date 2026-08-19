"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Search, Plus, BookOpen, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PageLessonBanner } from "@/components/admin/page-lesson-banner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Task {
  id: string; name: string; ratingScale: string; maxScore: number;
  isActive: boolean;
  programmes: { programme: { id: string; name: string } }[];
  yearLevels: { yearLevel: number }[];
  category: { id: string; name: string } | null;
  _count: { steps: number };
}

const scaleLabels: Record<string, { label: string; className: string }> = {
  SCALE_0_4: { label: "0–4 Scale", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  SCALE_0_2: { label: "0–2 Scale", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
};

export default function TaskBankPage() {
  const [search, setSearch] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [yearLevelFilter, setYearLevelFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks").then((r) => r.data),
  });

  const { data: programmes } = useQuery({
    queryKey: ["programmes"],
    queryFn: () => api.get("/programmes").then((r) => r.data),
  });

  const filtered = tasks?.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchProg = programmeFilter === "all" || t.programmes?.some((p) => p.programme.id === programmeFilter);
    const matchCat = categoryFilter === "all" || t.category?.name === categoryFilter;
    const matchYear = yearLevelFilter === "all" || t.yearLevels?.some((yl) => yl.yearLevel.toString() === yearLevelFilter);
    return matchSearch && matchProg && matchCat && matchYear;
  }) ?? [];

  const categories = [...new Set(tasks?.map((t) => t.category?.name).filter(Boolean) ?? [])];

  const limit = 15;
  const total = filtered.length;
  const paginatedTasks = filtered.slice((page - 1) * limit, page * limit);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleProgrammeChange = (val: string | null) => {
    setProgrammeFilter(val ?? "all");
    setPage(1);
  };

  const handleCategoryChange = (val: string | null) => {
    setCategoryFilter(val ?? "all");
    setPage(1);
  };

  const handleYearLevelChange = (val: string | null) => {
    setYearLevelFilter(val ?? "all");
    setPage(1);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Context-aware Page Lesson Banner */}
      <PageLessonBanner />
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Task Bank</h1>
          <p className="page-subtitle">All practical examination tasks — {tasks?.length ?? 0} tasks across all programmes</p>
        </div>
        <Link href="/admin/tasks/new">
          <Button className="gradient-primary border-0 text-white shadow-md hover:opacity-90" id="new-task-btn">
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="task-search"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={programmeFilter} onValueChange={handleProgrammeChange}>
          <SelectTrigger className="w-44 h-9" id="programme-filter">
            <SelectValue placeholder="All Programmes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programmes</SelectItem>
            {programmes?.map((p: { id: string; name: string }) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearLevelFilter} onValueChange={handleYearLevelChange}>
          <SelectTrigger className="w-36 h-9" id="year-level-filter">
            <SelectValue placeholder="All Year Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            <SelectItem value="2">Year 2</SelectItem>
            <SelectItem value="3">Year 3</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-44 h-9" id="category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c!}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats row */}
      {!isLoading && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{filtered.length}</strong> tasks shown</span>
          <span>·</span>
          <span><strong className="text-foreground">{tasks?.filter(t => t.ratingScale === 'SCALE_0_4').length ?? 0}</strong> on 0–4 scale</span>
          <span>·</span>
          <span><strong className="text-foreground">{tasks?.filter(t => t.ratingScale === 'SCALE_0_2').length ?? 0}</strong> on 0–2 scale</span>
        </div>
      )}

      {/* Task list */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Task Name</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Programmes</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Years</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Category</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Steps</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Rating Scale</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Max Score</TableHead>
              <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right h-11">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i} className="hover:bg-muted/5 animate-pulse">
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-52" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell className="px-6 py-4"><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell className="px-6 py-4 text-right"><Skeleton className="h-5 w-16 rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : paginatedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No tasks found</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTasks.map((task) => (
                <TableRow
                  key={task.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors cursor-pointer group",
                    !task.isActive && "opacity-60 bg-muted/5"
                  )}
                  id={`task-row-${task.id}`}
                  onClick={() => { window.location.href = "/admin/tasks/" + task.id; }}
                >
                  <TableCell className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {task.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {task.programmes?.map((p) => (
                        <Badge key={p.programme.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {p.programme.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-3.5 text-xs text-muted-foreground font-semibold">
                    {task.yearLevels?.map((yl) => `Y${yl.yearLevel}`).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="px-6 py-3.5 text-xs text-muted-foreground">
                    {task.category?.name ?? "—"}
                  </TableCell>
                  <TableCell className="px-6 py-3.5 text-xs font-semibold text-foreground">
                    {task._count?.steps ?? 0}
                  </TableCell>
                  <TableCell className="px-6 py-3.5">
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full border shadow-sm",
                      scaleLabels[task.ratingScale]?.className
                    )}>
                      {scaleLabels[task.ratingScale]?.label}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-3.5 text-sm font-bold text-foreground">
                    {task.maxScore}
                  </TableCell>
                  <TableCell className="px-6 py-3.5 text-right">
                    {task.isActive ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border bg-muted">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Premium Pagination Footer */}
        {total > 0 && (
          <div className="px-6 py-4 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{Math.min((page - 1) * limit + 1, total)}</span> to{" "}
              <span className="font-semibold text-foreground">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-semibold text-foreground">{total}</span> tasks
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
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setPage(page + 1)}
                disabled={page * limit >= total}
              >
                Next
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setPage(Math.ceil(total / limit))}
                disabled={page * limit >= total}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
