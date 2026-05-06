"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { PlanLimitsSummary } from "@/components/workspace/PlanLimitsSummary";
import { useI18n } from "@/components/providers/LanguageProvider";
import { FEATURES } from "@/config/features";
import { logoutUser } from "@/lib/api/auth";
import { startLogoutInProgress } from "@/lib/auth/session";
import { useAuthStore } from "@/lib/store/auth-store";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";

export type NavItem = {
  label: string;
  href: string;
  icon: "dashboard" | "reports" | "new-report" | "integrations" | "settings" | "billing" | "plans" | "profile" | "admin";
  match: "exact" | "prefix";
};

type SidebarProps = {
  items: NavItem[];
  mobile?: boolean;
  onNavigate?: () => void;
};

export function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function NavIcon({ icon, active }: { icon: NavItem["icon"]; active: boolean }) {
  const className = active ? "stroke-white" : "stroke-slate-400";

  switch (icon) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${className}`}>
          <path d="M4 5.5h7v6H4zM13 5.5h7v13h-7zM4 13.5h7v5H4z" strokeWidth="1.8" />
        </svg>
      );
    case "reports":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${className}`}>
          <path d="M7 4.75h7l3 3V19.25H7z" strokeWidth="1.8" />
          <path d="M10 11.5h6M10 15.5h4" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "new-report":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${className}`}>
          <path d="M12 5v14M5 12h14" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="8.25" strokeWidth="1.8" />
        </svg>
      );
    case "integrations":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${className}`}>
          <path
            d="M9 6V4.75M15 6V4.75M8 10.5h8a1 1 0 0 0 1-1v-1A2.75 2.75 0 0 0 14.25 5.75h-4.5A2.75 2.75 0 0 0 7 8.5v1a1 1 0 0 0 1 1Z"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 10.5v3.25c0 1.1.9 2 2 2h1.5a2.5 2.5 0 0 1 2.5 2.5v.75M12 13.5v6"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${className}`}>
          <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5z" strokeWidth="1.8" />
          <path d="M19 12a7.56 7.56 0 0 0-.12-1.33l1.67-1.3-1.6-2.77-2 .8a7.97 7.97 0 0 0-2.3-1.33l-.3-2.1H9.65l-.3 2.1a7.97 7.97 0 0 0-2.3 1.33l-2-.8-1.6 2.77 1.67 1.3a7.8 7.8 0 0 0 0 2.66l-1.67 1.3 1.6 2.77 2-.8a7.97 7.97 0 0 0 2.3 1.33l.3 2.1h3.7l.3-2.1a7.97 7.97 0 0 0 2.3-1.33l2 .8 1.6-2.77-1.67-1.3c.08-.43.12-.88.12-1.33Z" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "billing":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${className}`}>
          <rect x="4" y="6.5" width="16" height="11" rx="2.5" strokeWidth="1.8" />
          <path d="M4 10h16M8 14.5h3" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "plans":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${className}`}>
          <path d="M5 17.5h14M7 17.5V9.5M12 17.5V6.5M17 17.5v-4" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${className}`}>
          <circle cx="12" cy="8" r="3.25" strokeWidth="1.8" />
          <path d="M5.5 18.25c1.78-2.5 4.02-3.75 6.5-3.75s4.72 1.25 6.5 3.75" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "admin":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${className}`}>
          <path d="M12 4.75l6.5 2.5v4.4c0 4.05-2.52 7.75-6.5 9.1-3.98-1.35-6.5-5.05-6.5-9.1v-4.4l6.5-2.5Z" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.5 12.25l1.6 1.6 3.4-3.6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export function Sidebar({ items, mobile = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { messages } = useI18n();
  const showPlanSummary = false;
  const showUpgradePlanButton = false;
  const logout = useAuthStore((state) => state.logout);
  const { workspace, reportsUsedThisMonth } = useActiveWorkspace({
    includeReportsUsage: true,
  });

  async function handleLogout() {
    startLogoutInProgress();

    try {
      await logoutUser();
    } catch (error) {
      console.warn("logout request failed", {
        message: error instanceof Error ? error.message : "Unknown logout error",
      });
    } finally {
      logout();
      router.replace("/login");
    }
  }

  return (
    <aside
      className={`flex shrink-0 flex-col border-white/10 bg-[linear-gradient(180deg,var(--navy-950)_0%,var(--navy-900)_100%)] text-white ${
        mobile
          ? "h-full w-full max-w-[20rem] border-r"
          : "sticky top-0 hidden h-screen w-72 border-r md:flex"
      }`}
    >
      <div className="border-b border-white/10 px-5 py-6 md:px-6 md:py-7">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--measurable-blue)] text-sm font-semibold tracking-[0.22em] text-white">
              M
            </div>
            <div>
              <p className="text-lg font-semibold">Measurable</p>
              <p className="text-sm text-slate-400">{messages.shell.decisionReadyReporting}</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-4 py-5 md:py-6">
        {items.map((item) => {
          const active = isActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-label={item.label}
              className={`flex items-center rounded-2xl text-sm font-medium transition ${
                "gap-3 px-4 py-3"
              } ${
                active
                  ? "bg-[rgba(23,73,255,0.22)] text-white shadow-[inset_0_0_0_1px_rgba(191,215,237,0.18)]"
                  : "text-slate-400 hover:bg-white/6 hover:text-white"
              }`}
            >
              <NavIcon icon={item.icon} active={active} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-5 md:px-6">
        <div className="rounded-2xl bg-white/6 p-4">
          {showPlanSummary && workspace ? (
            <div className="mb-4">
              <PlanLimitsSummary
                workspace={workspace}
                reportsUsedThisMonth={reportsUsedThisMonth}
                variant="sidebar"
              />
            </div>
          ) : null}

          {!FEATURES.ENABLE_APP_REVIEW_MODE && showUpgradePlanButton ? (
            <Link
              href="/plans"
              onClick={onNavigate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--measurable-blue)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--measurable-blue-hover)]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5 stroke-current">
                <path
                  d="M5 18.5h14l-1.6-8.5-4.15 3.2L12 6.5l-1.25 6.7L6.6 10 5 18.5Z"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M8 18.5V20h8v-1.5" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              {messages.shell.upgradePlan}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => void handleLogout()}
            className={`w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/12 ${
              FEATURES.ENABLE_APP_REVIEW_MODE || !showUpgradePlanButton ? "" : "mt-4"
            }`}
          >
            {messages.shell.logout}
          </button>
        </div>
      </div>
    </aside>
  );
}
