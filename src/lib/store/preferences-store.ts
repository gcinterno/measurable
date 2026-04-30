"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark";
export type AppLanguage = "en" | "es";

type PreferencesState = {
  hasHydrated: boolean;
  brandName: string;
  displayName: string;
  logoDataUrl: string;
  timezone: string;
  language: AppLanguage;
  theme: ThemeMode;
  setHasHydrated: (value: boolean) => void;
  setPreferences: (input: {
    brandName: string;
    displayName: string;
    logoDataUrl: string;
    timezone: string;
    language: AppLanguage;
    theme: ThemeMode;
  }) => void;
  updatePreferences: (
    input: Partial<{
      brandName: string;
      displayName: string;
      logoDataUrl: string;
      timezone: string;
      language: AppLanguage;
      theme: ThemeMode;
    }>
  ) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      brandName: "Measurable",
      displayName: "Alex Lane",
      logoDataUrl: "",
      timezone: "America/Mexico_City",
      language: "en",
      theme: "light",
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setPreferences: (input) => set(input),
      updatePreferences: (input) => set(input),
    }),
    {
      name: "measurable-preferences",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<PreferencesState>) || {};

        return {
          ...currentState,
          ...persisted,
          brandName: persisted.brandName ?? persisted.displayName ?? currentState.brandName,
          displayName: persisted.displayName ?? currentState.displayName,
        };
      },
    }
  )
);
