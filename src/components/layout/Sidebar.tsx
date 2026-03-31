"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { clearSession } from "@/lib/auth/session";

type NavItem = {
  label: string;
  href: string;
  icon: "dashboard" | "reports" | "new-report" | "integrations" | "settings" | "billing" | "plans" | "profile";
  match: "exact" | "prefix";
};

type SidebarProps = {
  items: NavItem[];
};

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavIcon({ icon, active }: { icon: NavItem["icon"]; active: boolean }) {
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
  }
}

export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("sidebarCollapsed") === "true";
  });

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  function toggleCollapsed() {
    setCollapsed((current) => {
      const nextValue = !current;
      window.localStorage.setItem("sidebarCollapsed", String(nextValue));
      return nextValue;
    });
  }

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_32%),linear-gradient(180deg,#111827_0%,#0f172a_100%)] text-white transition-[width] duration-200 md:flex ${
        collapsed ? "w-24" : "w-72"
      }`}
    >
      <div className={`border-b border-white/10 ${collapsed ? "px-4 py-5" : "px-6 py-7"}`}>
        <div className={`flex ${collapsed ? "flex-col items-center gap-4" : "items-center justify-between gap-3"}`}>
          <div className={`flex items-center ${collapsed ? "flex-col gap-3" : "gap-3"}`}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold tracking-[0.22em] text-sky-200">
              M
            </div>
            {!collapsed ? (
              <div>
                <p className="text-lg font-semibold">Measurable</p>
                <p className="text-sm text-slate-400">Decision-ready reporting</p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir sidebar" : "Minimizar sidebar"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            {collapsed ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current">
                <path d="M9 6l6 6-6 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current">
                <path d="M7 7l10 10M17 7L7 17" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <nav className={`flex flex-1 flex-col gap-1 ${collapsed ? "px-3 py-5" : "px-4 py-6"}`}>
        {items.map((item) => {
          const active = isActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-2xl text-sm font-medium transition ${
                collapsed
                  ? "justify-center px-3 py-3.5"
                  : "gap-3 px-4 py-3"
              } ${
                active
                  ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  : "text-slate-400 hover:bg-white/6 hover:text-white"
              }`}
            >
              <NavIcon icon={item.icon} active={active} />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={`border-t border-white/10 ${collapsed ? "px-3 py-4" : "px-6 py-5"}`}>
        <div className={`rounded-2xl bg-white/6 ${collapsed ? "p-2.5" : "p-4"}`}>
          {!collapsed ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/7 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
                  Plan Free
                </p>
                <p className="mt-3 text-sm font-medium text-white">
                  Uso del espacio
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">Reportes</span>
                      <span className="font-semibold text-white">2/3</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div className="h-2 w-2/3 rounded-full bg-sky-400" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">Storage utilizado</span>
                      <span className="font-semibold text-white">1.4 GB / 5 GB</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div className="h-2 w-[28%] rounded-full bg-emerald-400" />
                    </div>
                  </div>
                </div>

                <Link
                  href="/plans"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
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
                  Mejorar plan
                </Link>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-4 w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/12"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <Link
                href="/plans"
                aria-label="Mejorar plan"
                title="Mejorar plan"
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-blue-600 text-white transition hover:bg-blue-500"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
                  <path
                    d="M5 18.5h14l-1.6-8.5-4.15 3.2L12 6.5l-1.25 6.7L6.6 10 5 18.5Z"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M8 18.5V20h8v-1.5" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Logout"
                title="Logout"
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-slate-300 transition hover:bg-white/12 hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
                  <path d="M10 7.75V6.5A2.5 2.5 0 0 1 12.5 4h3A2.5 2.5 0 0 1 18 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-3A2.5 2.5 0 0 1 10 17.5v-1.25" strokeWidth="1.7" strokeLinecap="round" />
                  <path d="M14 12H5m0 0l3-3m-3 3l3 3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
