"use client";

import { createContext, useContext, useEffect, useMemo } from "react";

import { getMessages, type Messages } from "@/lib/i18n/messages";
import { usePreferencesStore } from "@/lib/store/preferences-store";

type LanguageContextValue = {
  language: "en" | "es";
  messages: Messages;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  messages: getMessages("en"),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = usePreferencesStore((state) => state.language);
  const value = useMemo(
    () => ({
      language,
      messages: getMessages(language),
    }),
    [language]
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useI18n() {
  return useContext(LanguageContext);
}
