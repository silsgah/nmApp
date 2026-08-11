"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  BarChart3, Settings, LogOut, Stethoscope, Calendar,
  ChevronRight, ChevronDown, Bell, Menu, X, GraduationCap, Download, FileSpreadsheet, ShieldCheck, FileText
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SubNavItem {
  href: string;
  label: string;
  icon: any;
  exact?: boolean;
}

interface NavItem {
  href?: string;
  label: string;
  icon: any;
  exact?: boolean;
  children?: SubNavItem[];
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  {
    label: "Administration",
    icon: ShieldCheck,
    children: [
      { href: "/admin/programmes", label: "Programmes", icon: GraduationCap },
      { href: "/admin/sessions", label: "Exam Sessions", icon: Calendar },
      { href: "/admin/tasks", label: "Task Bank", icon: BookOpen },
      { href: "/admin/students", label: "Student Management", icon: GraduationCap },
      { href: "/admin/users", label: "Staff Management", icon: Users },
      { href: "/admin/assessment-matrix", label: "Assessment Matrix", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Downloads",
    icon: Download,
    children: [
      { href: "/admin/results", label: "Results Summary", icon: BarChart3 },
      { href: "/admin/case-studies", label: "Case Studies", icon: FileText },
      { href: "/admin/care-plans", label: "Care Plans", icon: Stethoscope },
    ],
  },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) =>
          child.exact ? pathname === child.href : pathname.startsWith(child.href)
        );
        if (hasActiveChild) {
          initial[item.label] = true;
        }
      }
    });
    return initial;
  });

  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) =>
          child.exact ? pathname === child.href : pathname.startsWith(child.href)
        );
        if (hasActiveChild) {
          setExpandedMenus((prev) => ({ ...prev, [item.label]: true }));
        }
      }
    });
  }, [pathname]);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    clearAuth();
    router.push("/login");
    toast.success("Logged out successfully");
  };

  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "AD";

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 overflow-hidden bg-white rounded-lg p-0.5 shadow-inner">
            <img src="/gaf-logo.png" alt="GAF Logo" className="w-8 h-8 object-contain" />
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-sm text-sidebar-foreground leading-tight truncate"
               style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              NM Portal
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">Admin Portal</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-3 py-2">
          Management
        </p>
        {navItems.map((item) => {
          if (item.children && item.children.length > 0) {
            const isChildActive = item.children.some((child) =>
              child.exact ? pathname === child.href : pathname.startsWith(child.href)
            );
            const isOpen = expandedMenus[item.label] ?? isChildActive;

            return (
              <div key={item.label} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleMenu(item.label)}
                  className={cn(
                    "sidebar-nav-item w-full flex items-center justify-between text-left cursor-pointer",
                    isChildActive && "bg-sidebar-accent/50 text-sidebar-foreground font-semibold"
                  )}
                  id={`admin-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="pl-4 ml-3 border-l border-sidebar-border/60 space-y-1 py-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "sidebar-nav-item py-2 text-xs",
                          isActive(child.href, child.exact) && "active"
                        )}
                        id={`admin-nav-${child.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <child.icon className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
                        <span className="flex-1 truncate">{child.label}</span>
                        {isActive(child.href, child.exact) && (
                          <ChevronRight className="w-3 h-3 opacity-60 flex-shrink-0" />
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "sidebar-nav-item",
                isActive(item.href!, item.exact) && "active"
              )}
              id={`admin-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {isActive(item.href!, item.exact) && (
                <ChevronRight className="w-3 h-3 opacity-60 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-sidebar-accent transition-colors">
          <Avatar className="w-8 h-8 flex-shrink-0">
            {user?.profilePictureUrl ? (
              <img src={user.profilePictureUrl} className="w-full h-full object-cover rounded-full" alt="Profile" />
            ) : (
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">
              {user?.name}
            </p>
            <Badge
              variant="outline"
              className="text-[10px] border-sidebar-border text-sidebar-foreground/60 h-4 px-1.5"
            >
              Admin
            </Badge>
          </div>
          <button
            onClick={handleLogout}
            className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
            title="Logout"
            id="admin-logout-btn"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 bg-sidebar flex-col fixed left-0 top-0 h-screen z-30 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Mobile: top bar + drawer */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <img src="/gaf-logo.png" alt="GAF Logo" className="w-5 h-5 object-contain bg-white rounded p-0.5" />
          <span className="font-bold text-sm text-sidebar-foreground">NM Portal</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-sidebar-foreground p-1"
          id="mobile-menu-toggle"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-20 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 h-screen w-72 bg-sidebar z-30 shadow-2xl">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
