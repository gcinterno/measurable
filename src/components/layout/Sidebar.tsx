"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { PlanLimitsSummary } from "@/components/workspace/PlanLimitsSummary";
import { useI18n } from "@/components/providers/LanguageProvider";
import { fetchAccountSummary, type AccountSummary } from "@/lib/api/account";
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
  const logout = useAuthStore((state) => state.logout);
  const { workspace, reportsUsedThisMonth } = useActiveWorkspace({
    includeReportsUsage: true,
  });
  const [collapsed, setCollapsed] = useState(false);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const isCollapsed = !mobile && collapsed;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadAccountSummary() {
      try {
        setSummaryLoading(true);
        const summary = await fetchAccountSummary({
          signal: controller.signal,
        });

        if (!active) {
          return;
        }

        setAccountSummary(summary);
      } catch (error) {
        if (!active || controller.signal.aborted) {
          return;
        }

        console.error("sidebar account summary load error:", error);
        setAccountSummary(null);
      } finally {
        if (active) {
          setSummaryLoading(false);
        }
      }
    }

    void loadAccountSummary();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const monthlyReportsSummary = useMemo(() => {
    if (summaryLoading) {
      return {
        title: "Reports Generated",
        counter: "—/—",
        progressPercent: 0,
        progressLabel: "Loading",
        unlimited: false,
      };
    }

    if (!accountSummary) {
      return null;
    }

    const hasMonthlyLimit =
      typeof accountSummary.reportsLimitThisMonth === "number" &&
      Number.isFinite(accountSummary.reportsLimitThisMonth) &&
      accountSummary.reportsLimitThisMonth > 0;

    if (hasMonthlyLimit) {
      const total = accountSummary.reportsLimitThisMonth;
      const fallbackRemaining =
        typeof accountSummary.reportsAvailableCount === "number"
          ? accountSummary.reportsAvailableCount
          : 0;
      const rawRemaining =
        typeof accountSummary.reportsRemainingThisMonth === "number"
          ? accountSummary.reportsRemainingThisMonth
          : fallbackRemaining;
      const remaining = Math.max(rawRemaining, 0);
      const used = Math.min(Math.max(total - remaining, 0), total);
      const progressPercent = total > 0 ? Math.min((used / total) * 100, 100) : 0;

      return {
        title: "Reports Generated",
        counter: `${used}/${total}`,
        progressPercent,
        progressLabel: "Current monthly cycle",
        unlimited: false,
      };
    }

    return {
      title: "Reports Generated",
      counter: `${accountSummary.reportsCreatedCount}`,
      progressPercent: null,
      progressLabel: "Unlimited",
      unlimited: true,
    };
  }, [accountSummary, summaryLoading]);

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
          : isCollapsed
            ? "sticky top-0 hidden h-screen w-24 border-r md:flex"
            : "sticky top-0 hidden h-screen w-72 border-r md:flex"
      }`}
    >
      <div
        className={`border-b border-white/10 py-6 md:py-7 ${
          isCollapsed ? "px-3" : "px-5 md:px-6"
        }`}
      >
        <div className={isCollapsed ? "flex flex-col items-center gap-3" : "flex items-center justify-between gap-4"}>
          <Link
            href="/dashboard"
            onClick={onNavigate}
            aria-label="Go to dashboard"
            className={`min-w-0 rounded-2xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/50 ${
              isCollapsed ? "flex justify-center" : "flex-1"
            }`}
          >
            <img
              src={isCollapsed ? "/brand/measurable-logo.svg" : "/brand/measurable-logo-white.svg"}
              alt="Measurable"
              className={`w-auto object-contain ${
                isCollapsed ? "h-11 max-w-[3rem]" : "h-16 max-w-[10.75rem]"
              }`}
            />
          </Link>
          {!mobile ? (
            <button
              type="button"
              onClick={() => setCollapsed((current) => !current)}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`flex shrink-0 items-center justify-center rounded-[1.7rem] border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white ${
                isCollapsed ? "h-12 w-12" : "h-14 w-14"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`h-5 w-5 stroke-current transition ${isCollapsed ? "rotate-180" : ""}`}
              >
                <path d="M15 6l-6 6 6 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      <nav className={`flex flex-1 flex-col gap-1 py-5 md:py-6 ${isCollapsed ? "px-3" : "px-4"}`}>
        {items.map((item) => {
          const active = isActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-label={item.label}
              className={`flex items-center rounded-2xl text-sm font-medium transition ${
                isCollapsed ? "justify-center px-3 py-3.5" : "gap-3 px-4 py-3"
              } ${
                active
                  ? "bg-[rgba(23,73,255,0.22)] text-white shadow-[inset_0_0_0_1px_rgba(191,215,237,0.18)]"
                  : "text-slate-400 hover:bg-white/6 hover:text-white"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <NavIcon icon={item.icon} active={active} />
              {!isCollapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={`border-t border-white/10 py-5 ${isCollapsed ? "px-3" : "px-5 md:px-6"}`}>
        <div className="space-y-3">
          {!isCollapsed && monthlyReportsSummary ? (
            <section className="rounded-[22px] border border-[#79a6ff]/18 bg-[linear-gradient(145deg,#2550ff_0%,#1749ff_54%,#1239d9_100%)] px-4 py-3.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_18px_34px_rgba(7,17,31,0.18)]">
              <p className="text-[0.78rem] font-semibold tracking-[0.02em] text-white/92">
                {monthlyReportsSummary.title}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  {monthlyReportsSummary.unlimited ? (
                    <div className="flex h-2.5 items-center rounded-full bg-white/14 px-2">
                      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/78">
                        Unlimited
                      </span>
                    </div>
                  ) : (
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#89a5ff]/38">
                      <div
                        className="h-full rounded-full bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
                        style={{ width: `${monthlyReportsSummary.progressPercent ?? 0}%` }}
                      />
                    </div>
                  )}
                </div>
                <p className="shrink-0 text-sm font-semibold tracking-tight text-white">
                  {monthlyReportsSummary.counter}
                </p>
              </div>
              <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">
                {monthlyReportsSummary.progressLabel}
              </p>
            </section>
          ) : null}

          <div className={`rounded-2xl bg-white/6 ${isCollapsed ? "p-2.5" : "p-4"}`}>
            {!isCollapsed && showPlanSummary && workspace ? (
              <div className="mb-4">
                <PlanLimitsSummary
                  workspace={workspace}
                  reportsUsedThisMonth={reportsUsedThisMonth}
                  variant="sidebar"
                />
              </div>
            ) : null}

            <Link
              href="/pricing"
              onClick={onNavigate}
              className={`group inline-flex w-full items-center rounded-2xl border border-[#2f63ff]/22 bg-[linear-gradient(135deg,rgba(23,73,255,0.18),rgba(96,165,250,0.08)_58%,rgba(255,255,255,0.06))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_30px_rgba(7,17,31,0.18)] transition hover:border-[#7fb1ff]/38 hover:bg-[linear-gradient(135deg,rgba(23,73,255,0.24),rgba(96,165,250,0.12)_58%,rgba(255,255,255,0.08))] ${
                isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3.5"
              }`}
              aria-label={messages.shell.upgradePlan}
              title={isCollapsed ? messages.shell.upgradePlan : undefined}
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/10">
                <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5 stroke-current">
                  <path
                    d="M5 18.5h14l-1.6-8.5-4.15 3.2L12 6.5l-1.25 6.7L6.6 10 5 18.5Z"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M8 18.5V20h8v-1.5" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </span>
              {!isCollapsed ? (
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">
                    Upgrade
                  </span>
                  <span className="block text-[11px] text-blue-100/84">
                    Get Started with 10% discount
                  </span>
                </span>
              ) : null}
            </Link>

            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label={messages.shell.logout}
              title={isCollapsed ? messages.shell.logout : undefined}
              className={`rounded-2xl border border-white/10 bg-white/8 text-sm font-medium text-white transition hover:bg-white/12 ${
                isCollapsed
                  ? "mt-0 flex h-12 w-full items-center justify-center"
                  : "mt-4 w-full px-4 py-3"
              }`}
            >
              {isCollapsed ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
                  <path
                    d="M10 6.75H8.75A2.75 2.75 0 0 0 6 9.5v5A2.75 2.75 0 0 0 8.75 17.25H10"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 8.5 17 12l-4 3.5M17 12H9.5"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                messages.shell.logout
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
