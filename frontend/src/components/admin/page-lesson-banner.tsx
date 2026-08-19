"use client";

import { usePathname } from "next/navigation";
import { BookOpen, Sparkles, ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TUTORIAL_TOPICS } from "./admin-tutorial-drawer";

export function PageLessonBanner() {
  const pathname = usePathname();

  // Find topic matching current route
  const currentTopic = TUTORIAL_TOPICS.find((t) =>
    t.routes?.some((r) => pathname === r || (r !== "/admin" && pathname.startsWith(r)))
  );

  if (!currentTopic) return null;

  const Icon = currentTopic.icon;

  return (
    <div className="mb-6 p-3.5 rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Page Lesson
            </span>
            <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 py-0">
              Admin Guide
            </Badge>
          </div>
          <p className="text-xs text-foreground font-medium mt-0.5">
            {currentTopic.title} — <span className="text-muted-foreground font-normal">{currentTopic.summary}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
