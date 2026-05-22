"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark";
export type AppLanguage = "en" | "es";
type LogoSource = "" | "manual" | "workspace";

type PreferencesState = {
  hasHydrated: boolean;
  brandName: string;
  displayName: string;
  logoDataUrl: string;
  logoSource: LogoSource;
  timezone: string;
  language: AppLanguage;
  theme: ThemeMode;
  setHasHydrated: (value: boolean) => void;
  setPreferences: (input: {
    brandName: string;
    displayName: string;
    logoDataUrl: string;
    logoSource: LogoSource;
    timezone: string;
    language: AppLanguage;
    theme: ThemeMode;
  }) => void;
  updatePreferences: (
    input: Partial<{
      brandName: string;
      displayName: string;
      logoDataUrl: string;
      logoSource: LogoSource;
      timezone: string;
      language: AppLanguage;
      theme: ThemeMode;
    }>
  ) => void;
};

function isPersistableLogoUrl(value: string | undefined) {
  if (!value) {
    return "";
  }

  const trimmedValue = value.trim();

  if (
    trimmedValue.startsWith("data:") ||
    trimmedValue.startsWith("blob:") ||
    trimmedValue.length > 2048
  ) {
    return "";
  }

  return trimmedValue;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      brandName: "Measurable",
      displayName: "Alex Lane",
      logoDataUrl: "",
      logoSource: "",
      timezone: "America/Mexico_City",
      language: "en",
      theme: "light",
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setPreferences: (input) => set(input),
      updatePreferences: (input) => set(input),
    }),
    {
      name: "measurable-preferences",
      partialize: (state) => ({
        brandName: state.brandName,
        displayName: state.displayName,
        logoDataUrl: isPersistableLogoUrl(state.logoDataUrl),
        logoSource: isPersistableLogoUrl(state.logoDataUrl) ? state.logoSource : "",
        timezone: state.timezone,
        language: state.language,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<PreferencesState>) || {};
        const persistedLogoUrl = isPersistableLogoUrl(persisted.logoDataUrl);

        return {
          ...currentState,
          ...persisted,
          brandName: persisted.brandName ?? persisted.displayName ?? currentState.brandName,
          displayName: persisted.displayName ?? currentState.displayName,
          logoDataUrl: persistedLogoUrl,
          logoSource: persistedLogoUrl ? persisted.logoSource ?? currentState.logoSource : "",
        };
      },
    }
  )
);
