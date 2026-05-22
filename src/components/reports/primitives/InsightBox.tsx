"use client";

import type { ReportTemplateId } from "@/lib/reports/template-selection";
import { getTemplateTone } from "@/components/reports/slides/template";

type InsightBoxProps = {
  text: string;
  className?: string;
  templateId?: ReportTemplateId;
  label?: string;
  bodyClassName?: string;
  clampLines?: number;
};

export function InsightBox({
  text,
  className = "",
  templateId = "executive",
  label = "Insight",
  bodyClassName = "",
  clampLines = 5,
}: InsightBoxProps) {
  const tone = getTemplateTone(templateId);
  const modern = templateId === "modern";

  return (
    <div
      className={`relative isolate min-h-0 overflow-hidden rounded-[26px] border p-5 ${
        modern ? tone.insight : tone.card
      } ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
      <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-sky-300/10 blur-2xl" />
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] ${
            modern
              ? "border-slate-300/65 bg-white/75 text-slate-800"
              : "border-white/10 bg-white/8 text-white/85"
          }`}
        >
          AI
        </span>
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
            modern ? tone.insightTitle : tone.accent
          }`}
        >
          {label}
        </p>
      </div>
      <p
        className={`mt-4 max-w-none overflow-hidden pr-1 text-[0.95rem] leading-[1.62] [display:-webkit-box] [-webkit-box-orient:vertical] ${
          modern ? tone.insightBody : tone.subtitle
        } ${bodyClassName}`}
        style={{
          WebkitLineClamp: clampLines,
        }}
      >
        {text}
      </p>
    </div>
  );
}
