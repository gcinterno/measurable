"use client";

import Image from "next/image";

import { useI18n } from "@/components/providers/LanguageProvider";

type IntegrationStatus = "Available" | "Connected" | "Coming soon";

type IntegrationCardProps = {
  name: string;
  category: string;
  description: string;
  status: IntegrationStatus;
  actionLabel: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  logoUrl: string;
  logoAlt: string;
};

function getBadgeClasses(status: IntegrationStatus) {
  switch (status) {
    case "Connected":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    case "Available":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
    case "Coming soon":
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
  secondaryActionLabel,
  onSecondaryAction,
  disabled = false,
  loading = false,
  error = "",
  logoUrl,
  logoAlt,
}: IntegrationCardProps) {
  const { messages } = useI18n();
  const blockedComingSoon = status === "Coming soon";
  const translatedStatus =
    status === "Connected"
      ? messages.integrationsPage.connected
      : status === "Available"
        ? messages.integrationsPage.available
        : messages.integrationsPage.comingSoon;

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 sm:h-12 sm:w-12">
          <Image
            src={logoUrl}
            alt={logoAlt}
            width={24}
            height={24}
            className="h-5 w-5 sm:h-6 sm:w-6"
            unoptimized
          />
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClasses(
            status
          )}`}
        >
          {translatedStatus}
        </span>
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-950 sm:text-lg">{name}</h2>
      <p className="mt-2 text-sm leading-5 text-slate-500 sm:leading-6">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAction}
          disabled={disabled || loading}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition sm:w-auto sm:px-4 ${
            blockedComingSoon
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70 blur-[0.2px]"
              : status === "Connected"
                ? "bg-slate-950 !text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                : "border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          }`}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          ) : null}
          {loading
            ? messages.integrationsPage.connecting
            : blockedComingSoon
              ? messages.common.comingSoon
              : actionLabel}
        </button>
        {secondaryActionLabel && onSecondaryAction ? (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:px-4"
          >
            {secondaryActionLabel}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
