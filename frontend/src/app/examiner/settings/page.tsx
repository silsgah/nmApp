"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  User, Lock, Camera, Trash2, Save, BadgeCheck, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ExaminerSettingsPage() {
  const { user, token, setAuth } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file size must be less than 2MB");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const res = await api.patch("/users/profile", { profilePictureUrl: base64String });
        if (user) {
          setAuth({ ...user, profilePictureUrl: res.data.profilePictureUrl }, token || "");
        }
        toast.success("Profile photo updated successfully");
      } catch (err: any) {
        toast.error(err.response?.data?.error || "Failed to update profile photo");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    try {
      setUploading(true);
      await api.patch("/users/profile", { profilePictureUrl: null });
      if (user) {
        setAuth({ ...user, profilePictureUrl: null }, token || "");
      }
      toast.success("Profile photo removed successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to remove profile photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      await api.patch("/users/profile", { password });
      toast.success("Password changed successfully");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "EX";

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title text-xl font-bold tracking-tight">Examiner Profile & Settings</h1>
        <p className="page-subtitle text-xs text-muted-foreground mt-0.5">Manage your examiner credentials and profile photograph</p>
      </div>

      {/* Profile Photo Section */}
      <Card className="rounded-2xl border border-border/80 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" /> Profile Photograph
          </CardTitle>
          <CardDescription className="text-xs">
            Upload a clear passport-sized photo for verification. Format: JPG or PNG (Max 2MB).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl border border-border/50 bg-muted/20">
            {/* Avatar frame */}
            <Avatar className="w-24 h-24 border-2 border-primary/20 shadow-md flex-shrink-0 bg-background">
              {user?.profilePictureUrl ? (
                <img src={user.profilePictureUrl} className="w-full h-full object-cover rounded-full" alt="Profile" />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold flex items-center justify-center">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>

            {/* Actions */}
            <div className="space-y-2 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  className="relative cursor-pointer h-8 text-xs font-semibold px-3"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  Choose Image
                </Button>
                {user?.profilePictureUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePhoto}
                    disabled={uploading}
                    className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50/50 cursor-pointer px-3"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                {uploading ? "Uploading photo..." : "Images are securely stored and verified against official portal credentials."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Details & Password */}
      <Card className="rounded-2xl border border-border/80 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Update Password
          </CardTitle>
          <CardDescription className="text-xs">
            Change your account password. Must be at least 6 characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={saving || !password}
                className="gradient-primary border-0 text-white hover:opacity-90 cursor-pointer h-9 px-5 shadow-sm"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {saving ? "Saving..." : "Change Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
