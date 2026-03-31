"use client";

import { create } from "zustand";

import { clearSession, getToken } from "@/lib/auth/session";

import type { AuthState, User } from "@/types/auth";

export const useAuthStore = create<AuthState>((set) => ({
  token: getToken(),
  user: null,
  login: (token: string, user: User) => {
    window.localStorage.setItem("token", token);
    set({ token, user });
  },
  logout: () => {
    clearSession();
    set({ token: null, user: null });
  },
}));
