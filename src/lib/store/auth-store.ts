"use client";

import { create } from "zustand";

import { clearOnboardingStatusCache } from "@/lib/api/onboarding";
import { clearSession, getToken, markSessionAuthenticated } from "@/lib/auth/session";

import type { AuthState, User } from "@/types/auth";

export const useAuthStore = create<AuthState>((set) => ({
  token: getToken(),
  user: null,
  login: (token: string | null, user: User) => {
    if (token) {
      window.localStorage.setItem("token", token);
    }

    markSessionAuthenticated();
    set({ token, user });
  },
  setUser: (user: User | null) => {
    set({ user });
  },
  logout: () => {
    clearOnboardingStatusCache();
    clearSession();
    set({ token: null, user: null });
  },
}));
