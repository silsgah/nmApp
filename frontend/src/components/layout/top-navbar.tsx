"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoutConfirmDialog } from "@/components/layout/logout-confirm-dialog";
import { LogOut, Shield, Stethoscope, GraduationCap, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopNavbarProps {
  portalName?: "Admin" | "Examiner" | "Student" | string;
}

export function TopNavbar({ portalName = "Portal" }: TopNavbarProps) {
  const { user } = useAuthStore();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "NM";

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return {
          icon: Shield,
          label: "Administrator",
          className:
            "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25",
        };
      case "EXAMINER":
        return {
          icon: Stethoscope,
          label: "Examiner",
          className:
            "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25",
        };
      case "STUDENT":
        return {
          icon: GraduationCap,
          label: "Candidate",
          className:
            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
        };
      default:
        return {
          icon: Shield,
          label: role || "User",
          className: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  const roleConfig = getRoleBadgeStyle(user?.role);
  const RoleIcon = roleConfig.icon;

  return (
    <>
      <header
        className="sticky top-0 z-20 w-full border-b border-border/60 bg-background/85 backdrop-blur-md transition-colors shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]"
        id="app-top-navbar"
      >
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
          {/* Left section: Institution & Portal branding */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="leading-tight">
                <p
                  className="font-bold text-xs sm:text-sm text-foreground truncate"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  GAFCONM Practical Portal
                </p>
                <p className="text-[10px] text-muted-foreground truncate hidden md:block">
                  Ghana Armed Forces College of Nursing and Midwifery
                </p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-border/60">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                2024/2025 Session
              </span>
            </div>
          </div>

          {/* Right section: Logged in User info, Role & Logout button */}
          <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
            {/* User Details Pill */}
            <div className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-xl bg-card border border-border/80 shadow-xs">
              <Avatar className="w-8 h-8 ring-1 ring-border shadow-2xs">
                {user?.profilePictureUrl ? (
                  <img
                    src={user.profilePictureUrl}
                    className="w-full h-full object-cover rounded-full"
                    alt={user?.name || "User"}
                  />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="flex flex-col min-w-0 text-left pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[120px] sm:max-w-[180px] lg:max-w-[220px]">
                    {user?.name || "Logged User"}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "hidden sm:inline-flex text-[10px] font-semibold px-2 py-0 h-4.5 gap-1 shadow-2xs",
                      roleConfig.className
                    )}
                  >
                    <RoleIcon className="w-2.5 h-2.5" />
                    {roleConfig.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {user?.staffId ? (
                    <span className="font-mono truncate max-w-[120px]">
                      ID: {user.staffId}
                    </span>
                  ) : (
                    <span className="truncate max-w-[120px]">
                      {user?.email || ""}
                    </span>
                  )}
                  <span className="sm:hidden font-semibold text-primary">
                    · {roleConfig.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogoutConfirmOpen(true)}
              className="h-9 px-2.5 sm:px-3 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50/50 hover:bg-red-100/70 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 border-red-200/80 dark:border-red-900/40 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              id="topbar-logout-btn"
              title="Log out of application"
            >
              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        portalName={portalName.toLowerCase()}
      />
    </>
  );
}
