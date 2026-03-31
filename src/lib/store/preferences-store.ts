"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark";

type PreferencesState = {
  displayName: string;
  logoDataUrl: string;
  timezone: string;
  language: string;
  theme: ThemeMode;
  setPreferences: (input: {
    displayName: string;
    logoDataUrl: string;
    timezone: string;
    language: string;
    theme: ThemeMode;
  }) => void;
  updatePreferences: (
    input: Partial<{
      displayName: string;
      logoDataUrl: string;
      timezone: string;
      language: string;
      theme: ThemeMode;
    }>
  ) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      displayName: "Alex Lane",
      logoDataUrl: "",
      timezone: "America/Mexico_City",
      language: "es",
      theme: "light",
      setPreferences: (input) => set(input),
      updatePreferences: (input) => set(input),
    }),
    {
      name: "measurable-preferences",
    }
  )
);
