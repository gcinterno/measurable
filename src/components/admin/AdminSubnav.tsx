"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { label: "Overview", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Insights", href: "/admin/insights" },
  { label: "Funnel", href: "/admin/funnel" },
  { label: "Cohorts", href: "/admin/cohorts" },
];

export function AdminSubnav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-4 z-20 mb-6 overflow-x-auto rounded-[20px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.92)] p-2 shadow-[0_10px_24px_rgba(15,23,42,0.035)] backdrop-blur">
      <div className="flex min-w-max gap-2">
      {adminLinks.map((link) => {
        const active = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex items-center rounded-[14px] px-4 py-2.5 text-sm font-semibold transition-all duration-150 ease-out ${
              active
                ? "bg-[var(--measurable-blue)] !text-white shadow-[0_8px_18px_rgba(23,73,255,0.22)]"
                : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      </div>
    </div>
  );
}
