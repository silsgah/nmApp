"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  BarChart3, Settings, LogOut, Stethoscope, Calendar,
  ChevronRight, Bell, Menu, X, GraduationCap
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/programmes", label: "Programmes", icon: GraduationCap },
  { href: "/admin/sessions", label: "Exam Sessions", icon: Calendar },
  { href: "/admin/tasks", label: "Task Bank", icon: BookOpen },
  { href: "/admin/students", label: "Student Management", icon: GraduationCap },
  { href: "/admin/users", label: "Staff Management", icon: Users },
  { href: "/admin/care-plans", label: "Care Plans", icon: Stethoscope },
  { href: "/admin/results", label: "Results", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

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
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "sidebar-nav-item",
              isActive(href, exact) && "active"
            )}
            id={`admin-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {isActive(href, exact) && (
              <ChevronRight className="w-3 h-3 opacity-60" />
            )}
          </Link>
        ))}
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
