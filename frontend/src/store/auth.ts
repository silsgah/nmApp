import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "ADMIN" | "EXAMINER" | "STUDENT";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  staffId?: string;
  profilePictureUrl?: string | null;
  programme?: { id: string; name: string; fullName: string } | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
      isAuthenticated: () => !!get().user,
    }),
    {
      name: "nm-portal-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
