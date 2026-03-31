"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: "dashboard" | "reports" | "new-report" | "integrations" | "settings" | "billing" | "plans" | "profile";
  match: "exact" | "prefix";
};

type MobileBottomNavProps = {
  items: NavItem[];
};

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavIcon({ icon, active }: { icon: NavItem["icon"]; active: boolean }) {
  const className = active ? "stroke-white" : "stroke-white";

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

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_34%),linear-gradient(180deg,#111827_0%,#0f172a_100%)] px-2 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2.5 backdrop-blur md:hidden">
      <nav className="grid auto-cols-[minmax(68px,1fr)] grid-flow-col gap-1.5 overflow-x-auto">
        {items.map((item) => {
          const active = isActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[68px] flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-medium transition ${
                active
                  ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  : "text-white hover:bg-white/6"
              }`}
            >
              <NavIcon icon={item.icon} active={active} />
              <span className="truncate text-white">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
