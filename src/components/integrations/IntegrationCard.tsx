"use client";

import Image from "next/image";
import Link from "next/link";

type IntegrationStatus = "Disponible" | "Conectado" | "Próximamente";

type IntegrationCardProps = {
  name: string;
  category: string;
  description: string;
  status: IntegrationStatus;
  actionLabel: string;
  onAction?: () => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  detailHref?: string;
  detailLabel?: string;
  logoUrl: string;
  logoAlt: string;
};

function getBadgeClasses(status: IntegrationStatus) {
  switch (status) {
    case "Conectado":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    case "Disponible":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
    case "Próximamente":
    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }
}

export function IntegrationCard({
  name,
  description,
  status,
  actionLabel,
  onAction,
  disabled = false,
  loading = false,
  error = "",
  detailHref,
  detailLabel,
  logoUrl,
  logoAlt,
}: IntegrationCardProps) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
          <Image
            src={logoUrl}
            alt={logoAlt}
            width={24}
            height={24}
            className="h-6 w-6"
            unoptimized
          />
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClasses(
            status
          )}`}
        >
          {status}
        </span>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">{name}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled || loading}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
        ) : null}
        {loading ? "Conectando..." : actionLabel}
      </button>
      {detailHref ? (
        <Link
          href={detailHref}
          className="mt-3 inline-flex text-sm font-medium text-sky-700"
        >
          {detailLabel || "Ver detalle"}
        </Link>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
