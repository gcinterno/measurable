"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { useI18n } from "@/components/providers/LanguageProvider";
import { NavIcon, isActive, type NavItem } from "@/components/layout/Sidebar";

type MobileBottomNavProps = {
  items: NavItem[];
};

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { messages } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const primaryAction = items.find((item) => item.href === "/reports/new/flow");
  const visibleItems = items.filter((item) =>
    ["/dashboard", "/reports", "/integrations"].includes(item.href)
  );

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[linear-gradient(180deg,#0f172a_0%,#08111f_100%)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-18px_40px_rgba(2,6,23,0.35)] md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between rounded-t-[28px]">
        {visibleItems.slice(0, 2).map((item) => {
          const active = isActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 py-1.5 text-center"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${
                  active ? "bg-white/14 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" : ""
                }`}
              >
                <NavIcon icon={item.icon} active />
              </div>
              <span className={`truncate text-[11px] font-medium ${active ? "text-white" : "text-white/72"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {primaryAction ? (
          <Link
            href={primaryAction.href}
            aria-label={messages.nav.newReport}
            className="mx-2 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-white/12 bg-white text-slate-950 shadow-[0_14px_28px_rgba(8,17,31,0.24)]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 stroke-slate-950">
              <path d="M12 6v12M6 12h12" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </Link>
        ) : null}

          {visibleItems.slice(2).map((item) => {
            const active = isActive(pathname, item);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 py-1.5 text-center"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${
                    active ? "bg-white/14 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" : ""
                  }`}
                >
                  <NavIcon icon={item.icon} active />
                </div>
                <span className={`truncate text-[11px] font-medium ${active ? "text-white" : "text-white/72"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 py-1.5 text-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-white">
                <path d="M5 7.5h14M5 12h14M5 16.5h14" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            </div>
            <span className="truncate text-[11px] font-medium text-white/72">
              Menu
            </span>
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
          />
          <div className="relative h-full max-w-[20rem]">
            <Sidebar
              items={items}
              mobile
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
