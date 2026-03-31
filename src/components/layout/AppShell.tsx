"use client";

import { ReactNode } from "react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppAssistantBubble } from "@/components/layout/AppAssistantBubble";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { usePreferencesStore } from "@/lib/store/preferences-store";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", match: "exact" },
  { label: "Reports", href: "/reports", icon: "reports", match: "exact" },
  { label: "New Report", href: "/reports/new", icon: "new-report", match: "exact" },
  { label: "Integrations", href: "/integrations", icon: "integrations", match: "exact" },
  { label: "Settings", href: "/settings", icon: "settings", match: "exact" },
  { label: "Billing", href: "/billing", icon: "billing", match: "exact" },
  { label: "Planes", href: "/plans", icon: "plans", match: "exact" },
  { label: "Profile", href: "/profile", icon: "profile", match: "exact" },
] as const;

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const theme = usePreferencesStore((state) => state.theme);
  const darkMode = theme === "dark";

  return (
    <AuthGuard requireAuth redirectTo="/login">
      <main
        className={`min-h-screen ${
          darkMode ? "bg-[#020617] text-white" : "bg-[#edf2f7] text-slate-950"
        }`}
      >
        <div className="flex min-h-screen">
          <Sidebar items={[...navItems]} />
          <div className={`flex min-w-0 flex-1 flex-col ${darkMode ? "measurable-dark" : ""}`}>
            <TopBar />
            <div className="flex-1 px-5 py-5 pb-28 sm:px-6 sm:py-6 sm:pb-28 lg:px-8 lg:py-8 lg:pb-8">
              {children}
            </div>
          </div>
        </div>
        <AppAssistantBubble />
        <MobileBottomNav items={[...navItems]} />
      </main>
    </AuthGuard>
  );
}
