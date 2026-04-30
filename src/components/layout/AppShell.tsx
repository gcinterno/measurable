"use client";

import { ReactNode } from "react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppAssistantBubble } from "@/components/layout/AppAssistantBubble";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useI18n } from "@/components/providers/LanguageProvider";
import { FEATURES } from "@/config/features";
import { usePreferencesStore } from "@/lib/store/preferences-store";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const theme = usePreferencesStore((state) => state.theme);
  const darkMode = theme === "dark";
  const { messages } = useI18n();
  const showBillingNav = false;
  const showPlansNav = false;
  const navItems = [
    { label: messages.nav.dashboard, href: "/dashboard", icon: "dashboard", match: "exact" },
    { label: messages.nav.reports, href: "/reports", icon: "reports", match: "exact" },
    { label: messages.nav.newReport, href: "/reports/new/flow", icon: "new-report", match: "exact" },
    { label: messages.nav.integrations, href: "/integrations", icon: "integrations", match: "exact" },
    ...(!FEATURES.ENABLE_APP_REVIEW_MODE && showBillingNav
      ? [
          { label: messages.nav.billing, href: "/billing", icon: "billing", match: "exact" },
        ]
      : []),
    ...(!FEATURES.ENABLE_APP_REVIEW_MODE && showPlansNav
      ? [
          { label: messages.nav.plans, href: "/plans", icon: "plans", match: "exact" },
        ]
      : []),
    { label: messages.nav.settings, href: "/settings", icon: "settings", match: "exact" },
  ] as const;

  return (
    <AuthGuard requireAuth redirectTo="/login">
      <main
        className={`min-h-screen overflow-x-hidden md:overflow-x-visible ${
          darkMode ? "bg-[#020617] text-white" : "bg-[#edf2f7] text-slate-950"
        }`}
      >
        <div className="flex min-h-screen max-w-full md:max-w-none">
          <Sidebar items={[...navItems]} />
          <div className={`flex min-w-0 max-w-full flex-1 flex-col md:max-w-none ${darkMode ? "measurable-dark" : ""}`}>
            <TopBar />
            <div className="flex-1 px-4 pb-28 pt-4 sm:px-6 sm:py-6 md:pb-6">
              {children}
            </div>
          </div>
        </div>
        <MobileBottomNav items={[...navItems]} />
        <AppAssistantBubble />
      </main>
    </AuthGuard>
  );
}
