"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, CheckSquare, LogOut, Stethoscope, ChevronRight, Menu, X, Settings, Search, FileText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogoutConfirmDialog } from "@/components/layout/logout-confirm-dialog";

const navItems = [
  { href: "/examiner", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/examiner/stations", label: "My Stations", icon: ClipboardList },
  { href: "/examiner/search", label: "Find Student", icon: Search },
  { href: "/examiner/case-study", label: "Case Study Entry", icon: FileText },
  { href: "/examiner/care-plan", label: "Care Plan Entry", icon: Stethoscope },
  { href: "/examiner/obstetric", label: "Obstetric Exam", icon: Stethoscope },
  { href: "/examiner/submitted", label: "Submitted", icon: CheckSquare },
  { href: "/examiner/settings", label: "Settings", icon: Settings },
];

export function ExaminerSidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "EX";
  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center bg-white rounded-lg p-0.5 shadow-inner">
            <img src="/gaf-logo.png" alt="GAF Logo" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <p className="font-bold text-sm text-sidebar-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>NM Portal</p>
            <p className="text-xs text-sidebar-foreground/50">Examiner Portal</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-3 py-2">Examination</p>
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn("sidebar-nav-item", isActive(href, exact) && "active")}
            id={`examiner-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {isActive(href, exact) && <ChevronRight className="w-3 h-3 opacity-60" />}
          </Link>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 rounded-lg p-2.5">
          <Avatar className="w-8 h-8">
            {user?.profilePictureUrl ? (
              <img src={user.profilePictureUrl} className="w-full h-full object-cover rounded-full" alt="Profile" />
            ) : (
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.name}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.staffId}</p>
          </div>
          <button onClick={() => setLogoutConfirmOpen(true)} className="text-sidebar-foreground/40 hover:text-sidebar-foreground" title="Logout" id="examiner-logout-btn">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex md:w-60 lg:w-64 bg-sidebar flex-col fixed left-0 top-0 h-screen z-30 shadow-xl">
        <SidebarContent />
      </aside>
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/gaf-logo.png" alt="GAF Logo" className="w-5 h-5 object-contain bg-white rounded p-0.5" />
          <span className="font-bold text-sm text-sidebar-foreground">NM Portal</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground p-1" id="examiner-mobile-menu">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-20 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="md:hidden fixed left-0 top-0 h-screen w-72 bg-sidebar z-30 shadow-2xl">
            <SidebarContent />
          </aside>
        </>
      )}
      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        portalName="examiner"
      />
    </>
  );
}
