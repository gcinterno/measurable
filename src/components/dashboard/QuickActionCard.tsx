import Link from "next/link";

type QuickActionCardProps = {
  title: string;
  description: string;
  href: string;
  icon?: "plus" | "reports" | "integrations";
};

export function QuickActionCard({
  title,
  description,
  href,
  icon = "plus",
}: QuickActionCardProps) {
  function renderIcon() {
    switch (icon) {
      case "reports":
        return (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
            <path d="M7 4.75h7l3 3V19.25H7z" strokeWidth="1.8" />
            <path d="M10 11.5h6M10 15.5h4" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        );
      case "integrations":
        return (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
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
      case "plus":
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
            <path d="M12 5v14M5 12h14" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        );
    }
  }

  return (
    <Link
      href={href}
      className="flex min-h-[154px] flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-5 text-center transition hover:border-slate-300 hover:bg-slate-100"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200">
        {renderIcon()}
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-2 max-w-[22ch] text-sm leading-6 text-slate-500">
        {description}
      </p>
    </Link>
  );
}
