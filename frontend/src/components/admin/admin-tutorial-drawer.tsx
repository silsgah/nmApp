"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  X,
  ChevronRight,
  Layers,
  Calendar,
  CheckSquare,
  Award,
  Settings,
  Users,
  Search,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileText,
  ShieldCheck,
  Zap,
  Info,
  ExternalLink,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TutorialTopic {
  id: string;
  title: string;
  category: "core" | "workflow" | "page" | "grading";
  routes?: string[];
  icon: any;
  summary: string;
  details: string[];
  proTip?: string;
  relatedLinks?: { label: string; route: string }[];
}

export const TUTORIAL_TOPICS: TutorialTopic[] = [
  {
    id: "architecture",
    title: "Session ↔ Station ↔ Task Concept",
    category: "core",
    icon: Layers,
    summary: "Understand the core relationship between Tasks, Exam Sessions, and Stations.",
    details: [
      "1. TASK (The Checklist Blueprint): A reusable clinical procedure stored in the Task Bank (e.g., 'Resuscitation of Newborn'). Defines step-by-step ratings and max scores.",
      "2. EXAM SESSION (The Exam Event Container): A scheduled exam for a cohort (e.g., '2026 RM Year 2 Practical Exam'). Defines overall pass marks and date ranges.",
      "3. STATION (The Booth in a Session): Belongs to an Exam Session and receives assigned examiners and students. The examiner selects the candidate's eligible task during assessment."
    ],
    proTip: "Tasks are created once in the Task Bank and can be reused in multiple Exam Sessions across different academic years.",
    relatedLinks: [
      { label: "Manage Task Bank", route: "/admin/tasks" },
      { label: "Manage Exam Sessions", route: "/admin/sessions" }
    ]
  },
  {
    id: "session-lifecycle",
    title: "Exam Session Lifecycle & Statuses",
    category: "workflow",
    routes: ["/admin/sessions"],
    icon: Calendar,
    summary: "Learn how Exam Sessions transition from Draft to Marking and Completed.",
    details: [
      "• DRAFT: Session is under configuration. Hidden from Examiners and Students. Only Admins can view and edit.",
      "• ACTIVE: Exam is actively taking place. Examiners can view assigned stations and submit scorecards.",
      "• MARKING: Practical scoring concluded;Care Plan or Case Study evaluations can still be marked.",
      "• COMPLETED: Exam completed and results finalized."
    ],
    proTip: "A session in DRAFT mode will NEVER appear in examiner or student drop-downs. Change status to ACTIVE when the exam commences.",
    relatedLinks: [
      { label: "Go to Sessions", route: "/admin/sessions" },
      { label: "Assessment Matrix", route: "/admin/assessment-matrix" }
    ]
  },
  {
    id: "grading-engine",
    title: "Independent Grading Engine",
    category: "grading",
    routes: ["/admin/results", "/admin/settings"],
    icon: Award,
    summary: "How student scores are calculated independently for Practicals, Care Plans, and Case Studies.",
    details: [
      "• PRACTICAL STATIONS: Scores scaled to category weights (e.g., Midwifery 80 marks). Candidate must meet category minimum pass %.",
      "• CARE PLAN: Evaluated ONLY if Care Plan scores were submitted for that student. Excluded if not administered.",
      "• CASE STUDY: Evaluated ONLY if a 100-mark Case Study rubric was submitted. Excluded if not administered.",
      "• PASS CRITERIA: Candidate passes if overall % >= pass mark AND all assessed categories meet min pass threshold."
    ],
    proTip: "Unassessed components (e.g., sessions without Care Plans) will not penalize candidates or force automatic failure.",
    relatedLinks: [
      { label: "View Results & Compute", route: "/admin/results" },
      { label: "Grading Settings", route: "/admin/settings" }
    ]
  },
  {
    id: "page-dashboard",
    title: "Admin Dashboard Overview",
    category: "page",
    routes: ["/admin"],
    icon: Zap,
    summary: "High-level real-time analytics, active exam sittings, and candidate metrics.",
    details: [
      "• Quick metrics showing total sessions, active tasks, student enrolments, and submitted scorecards.",
      "• Fast access buttons to launch new sessions or review pending examiner scorecard submissions."
    ],
    proTip: "Check the active sessions card to see which exams are currently accepting examiner scorecards.",
    relatedLinks: [
      { label: "Create New Session", route: "/admin/sessions/new" },
      { label: "Task Bank", route: "/admin/tasks" }
    ]
  },
  {
    id: "page-tasks",
    title: "Task Bank & Rubrics",
    category: "page",
    routes: ["/admin/tasks"],
    icon: CheckSquare,
    summary: "Define clinical tasks, step checklists, rating scales, and max marks.",
    details: [
      "• Add step-by-step procedures with ratings (e.g. 0-4 per step). Max score computes automatically (steps × 4).",
      "• Assign tasks to target programmes (RGN, RM) and year levels (Year 1, 2, 3).",
      "• Mark critical steps as 'Key Steps' for examiner emphasis."
    ],
    proTip: "Keep task titles clear and descriptive as examiners see them directly on station digital scorecards.",
    relatedLinks: [
      { label: "Add New Task", route: "/admin/tasks/new" },
      { label: "Assessment Categories", route: "/admin/programmes" }
    ]
  },
  {
    id: "page-care-plans",
    title: "Nursing Care Plan Assessments",
    category: "page",
    routes: ["/admin/care-plans"],
    icon: FileText,
    summary: "Manage Nursing Care Plan assessment types, weights, and student marks.",
    details: [
      "• Set up Care Plan types (e.g. Medical Care Plan, Surgical Care Plan) with max marks.",
      "• Record examiner Care Plan scores per candidate.",
      "• Scores automatically scale into the overall candidate result if administered for that session."
    ],
    proTip: "Care Plans are program-specific; ensure care plan types are assigned to the correct programme (e.g. RGN or RM).",
    relatedLinks: [
      { label: "Go to Care Plans", route: "/admin/care-plans" },
      { label: "View Results", route: "/admin/results" }
    ]
  },
  {
    id: "page-case-studies",
    title: "Case Study Rubric Evaluations",
    category: "page",
    routes: ["/admin/case-studies"],
    icon: GraduationCap,
    summary: "100-Mark Midwifery & Obstetric Case Study evaluation matrix and slips.",
    details: [
      "• Standardized 6-section 26-item rubric covering Data Gathering, Pregnancy, Labour, Puerperium, Care Plan & Presentation.",
      "• Review itemized marks and examiner comments per candidate.",
      "• Print official candidate Case Study evaluation slips for academic files."
    ],
    proTip: "Examiners fill case study evaluations via /examiner/case-study; admins monitor progress here.",
    relatedLinks: [
      { label: "Go to Case Studies", route: "/admin/case-studies" },
      { label: "Results Overview", route: "/admin/results" }
    ]
  },
  {
    id: "page-results",
    title: "Results Computation & Broadsheets",
    category: "page",
    routes: ["/admin/results"],
    icon: Award,
    summary: "Compute, inspect, publish final results, and generate broadsheets.",
    details: [
      "• Click 'Compute Results' to execute the grading engine for an active or completed session.",
      "• View full breakdown of station scores, category percentage, scaled scores, and final grades (A, B, C, D, FAIL).",
      "• Download individual candidate PDF result slips or official institution Broadsheet PDFs."
    ],
    proTip: "Results can be re-computed anytime if examiner scorecards are edited or added.",
    relatedLinks: [
      { label: "Go to Results", route: "/admin/results" },
      { label: "System Settings", route: "/admin/settings" }
    ]
  }
];

export function AdminTutorialDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "all" | "core" | "grading">("current");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  // Find topic matching current route
  const currentTopic = TUTORIAL_TOPICS.find((t) =>
    t.routes?.some((r) => pathname === r || (r !== "/admin" && pathname.startsWith(r)))
  ) || TUTORIAL_TOPICS[0];

  useEffect(() => {
    if (currentTopic) {
      setExpandedTopicId(currentTopic.id);
    }
  }, [pathname, currentTopic?.id]);

  useEffect(() => {
    const openGuide = () => setIsOpen(true);
    window.addEventListener("open-admin-guide", openGuide);
    return () => window.removeEventListener("open-admin-guide", openGuide);
  }, []);

  const filteredTopics = TUTORIAL_TOPICS.filter((topic) => {
    const matchesSearch =
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.details.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeTab === "core") return topic.category === "core" || topic.category === "workflow";
    if (activeTab === "grading") return topic.category === "grading";
    return true;
  });

  return (
    <>
      {/* Slide-over Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Body */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-gradient-to-r from-emerald-950/40 via-background to-background flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                Admin Knowledge & Lessons
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px]">
                  Interactive Guide
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Understand architecture, exam lifecycles & grading rules.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Current Page Highlight Banner */}
        {currentTopic && (
          <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Lesson for Current Screen
              </span>
              <Badge className="bg-emerald-600 text-white text-[10px]">Active Page</Badge>
            </div>
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <currentTopic.icon className="w-4 h-4 text-emerald-500" />
              {currentTopic.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {currentTopic.summary}
            </p>
            {currentTopic.relatedLinks && currentTopic.relatedLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground self-center font-medium">Quick Links:</span>
                {currentTopic.relatedLinks.map((link, idx) => (
                  <Button
                    key={idx}
                    variant="secondary"
                    size="sm"
                    className="h-6 text-[11px] px-2.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                    onClick={() => {
                      setIsOpen(false);
                      router.push(link.route);
                    }}
                  >
                    {link.label}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tabs & Search */}
        <div className="p-4 border-b border-border bg-muted/20 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search concepts, grading rules, pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <Button
              variant={activeTab === "current" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full px-3"
              onClick={() => setActiveTab("current")}
            >
              Current Screen
            </Button>
            <Button
              variant={activeTab === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full px-3"
              onClick={() => setActiveTab("all")}
            >
              All Lessons ({TUTORIAL_TOPICS.length})
            </Button>
            <Button
              variant={activeTab === "core" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full px-3"
              onClick={() => setActiveTab("core")}
            >
              Architecture & Workflow
            </Button>
            <Button
              variant={activeTab === "grading" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full px-3"
              onClick={() => setActiveTab("grading")}
            >
              Grading Engine
            </Button>
          </div>
        </div>

        {/* Topics List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === "current" && currentTopic ? (
            <TopicCard
              topic={currentTopic}
              isExpanded={true}
              onToggle={() => {}}
              onNavigate={(route) => {
                setIsOpen(false);
                router.push(route);
              }}
            />
          ) : filteredTopics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
              <HelpCircle className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p>No lessons found matching &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            filteredTopics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                isExpanded={expandedTopicId === topic.id}
                onToggle={() => setExpandedTopicId(expandedTopicId === topic.id ? null : topic.id)}
                onNavigate={(route) => {
                  setIsOpen(false);
                  router.push(route);
                }}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/10 text-center">
          <p className="text-[11px] text-muted-foreground">
            Need AI assistance? Use the <span className="font-semibold text-emerald-600 dark:text-emerald-400">Admin AI Copilot</span> on the bottom right.
          </p>
        </div>
      </div>
    </>
  );
}

function TopicCard({
  topic,
  isExpanded,
  onToggle,
  onNavigate
}: {
  topic: TutorialTopic;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: (route: string) => void;
}) {
  const Icon = topic.icon;

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden transition-all shadow-xs">
      <button
        onClick={onToggle}
        className="w-full p-3.5 text-left flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-2">
              {topic.title}
              {topic.category === "core" && (
                <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-500 py-0">
                  Concept
                </Badge>
              )}
              {topic.category === "grading" && (
                <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-500 py-0">
                  Scoring
                </Badge>
              )}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{topic.summary}</p>
          </div>
        </div>
        <ChevronRight
          className={cn("w-4 h-4 text-muted-foreground transition-transform mt-1 shrink-0", isExpanded && "rotate-90")}
        />
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-border/50 bg-muted/10 space-y-3 mt-1 text-xs">
          <div className="space-y-2 mt-3">
            {topic.details.map((detail, idx) => (
              <p key={idx} className="text-muted-foreground leading-relaxed">
                {detail}
              </p>
            ))}
          </div>

          {topic.proTip && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
              <span className="font-bold">💡 Pro Tip: </span>
              {topic.proTip}
            </div>
          )}

          {topic.relatedLinks && topic.relatedLinks.length > 0 && (
            <div className="pt-2 flex flex-wrap gap-2 border-t border-border/40">
              <span className="text-[10px] text-muted-foreground self-center font-medium">Navigate to:</span>
              {topic.relatedLinks.map((link, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] px-2.5 hover:border-emerald-500 hover:text-emerald-600"
                  onClick={() => onNavigate(link.route)}
                >
                  {link.label}
                  <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
