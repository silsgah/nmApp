"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Stethoscope, Shield, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { AuthUser } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setAuth(data.user as AuthUser, data.token);

      const role = data.user.role;
      if (role === "ADMIN") router.push("/admin");
      else if (role === "EXAMINER") router.push("/examiner");
      else router.push("/student");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Stethoscope, label: "RGN & RM practical assessment" },
    { icon: Shield, label: "Multi-examiner scoring engine" },
    { icon: BookOpen, label: "Configurable grading & reports" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel ─── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 gradient-primary" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
                              radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glowing orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                NM Practical Portal
              </p>
              <p className="text-white/70 text-xs">GAFCONM Examination System</p>
            </div>
          </div>

          {/* Hero */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Academic Year 2024/2025
            </div>
            <h1
              className="text-5xl font-bold leading-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Nursing &<br />Midwifery<br />
              <span className="text-white/70">Practical Exams</span>
            </h1>
            <p className="text-white/80 text-lg max-w-sm leading-relaxed">
              A modern, streamlined platform for clinical practical examination management.
            </p>

            <div className="space-y-3 pt-2">
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 text-white/85">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <p className="text-white/50 text-xs">
            © 2024 GAFCONM · Ghana Armed Forces College of Nursing and Midwifery
          </p>
        </div>
      </div>

      {/* ── Right Panel — Login Form ─── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                NM Practical Portal
              </p>
              <p className="text-muted-foreground text-xs">GAFCONM</p>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2
              className="text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Sign in to access your portal
            </p>
          </div>

          {/* Role pills */}
          <div className="flex gap-2">
            {["Admin", "Examiner", "Student"].map((r) => (
              <span
                key={r}
                className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {r}
              </span>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@nmportal.edu.gh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-background border-input"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10 bg-background border-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold gradient-primary border-0 hover:opacity-90 transition-opacity shadow-md"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="rounded-xl border bg-muted/50 p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Demo credentials
            </p>
            <div className="space-y-2">
              {[
                { role: "Admin", email: "admin@nmportal.edu.gh", pw: "Admin123!" },
                { role: "Examiner", email: "agnes.owusu@nmportal.edu.gh", pw: "Exam123!" },
                { role: "Student", email: "abena.asante@student.nmportal.edu.gh", pw: "Student123!" },
              ].map((c) => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => { setEmail(c.email); setPassword(c.pw); }}
                  className="w-full text-left rounded-lg px-3 py-2 text-xs hover:bg-accent/10 transition-colors flex items-center justify-between group"
                  id={`demo-${c.role.toLowerCase()}-btn`}
                >
                  <span className="font-medium text-foreground">{c.role}</span>
                  <span className="text-muted-foreground font-mono truncate ml-2 max-w-[200px]">
                    {c.email}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Trouble signing in? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
