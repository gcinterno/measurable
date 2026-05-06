"use client";

import { ReactNode, useEffect } from "react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppAssistantBubble } from "@/components/layout/AppAssistantBubble";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useI18n } from "@/components/providers/LanguageProvider";
import { FEATURES } from "@/config/features";
import { fetchCurrentUser } from "@/lib/api/me";
import { isAbortError, isAuthError } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth-store";
import { usePreferencesStore } from "@/lib/store/preferences-store";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const theme = usePreferencesStore((state) => state.theme);
  const darkMode = theme === "dark";
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { messages } = useI18n();
  const showBillingNav = false;
  const showPlansNav = false;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadShellUser() {
      try {
        const currentUser = await fetchCurrentUser({ signal: controller.signal });

        if (!active) {
          return;
        }

        if (process.env.NODE_ENV !== "production") {
          console.info("AUTH_ME_DEBUG", {
            scope: "AppShell",
            email: currentUser.email,
            isAdmin: currentUser.isAdmin,
            role: currentUser.role || null,
          });
        }

        setUser(currentUser);
      } catch (error) {
        if (!isAbortError(error) && !isAuthError(error)) {
          console.warn("app shell user bootstrap failed", error);
        }
      }
    }

    void loadShellUser();

    return () => {
      active = false;
      controller.abort();
    };
  }, [setUser]);

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
    ...(user?.isAdmin
      ? [
          {
            label: messages.nav.admin,
            href: "/admin",
            icon: "admin",
            match: "prefix",
          },
        ]
      : []),
  ] as const;

  return (
    <AuthGuard requireAuth redirectTo="/login">
      <main
        className={`min-h-screen overflow-x-hidden md:overflow-x-visible ${
          darkMode ? "bg-[var(--navy-950)] text-white" : "bg-[var(--background)] text-[var(--text-primary)]"
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
