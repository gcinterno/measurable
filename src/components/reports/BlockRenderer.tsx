"use client";

import type { ReportVersionBlock } from "@/types/report";

type BlockRendererProps = {
  block: ReportVersionBlock;
};

function getTextValue(text: string | null | undefined) {
  return text?.trim() || "Sin contenido disponible";
}

function getStatValue(value: ReportVersionBlock["data"]["value"]) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  return String(value);
}

export function BlockRenderer({ block }: BlockRendererProps) {
  if (block.type === "title") {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          Title
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {getTextValue(block.data.text)}
        </h2>
      </section>
    );
  }

  if (block.type === "stat") {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          {block.data.label || "Stat"}
        </p>
        <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          {getStatValue(block.data.value)}
        </p>
      </section>
    );
  }

  if (block.type === "text") {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          Text
        </p>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700 sm:text-base">
          {getTextValue(block.data.text)}
        </p>
      </section>
    );
  }

  return null;
}
