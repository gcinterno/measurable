"use client";

import type { ReportTemplateId } from "@/lib/reports/template-selection";
import { getTemplateTone } from "@/components/reports/slides/template";

type InsightBoxProps = {
  text: string;
  className?: string;
  templateId?: ReportTemplateId;
  label?: string;
  bodyClassName?: string;
};

export function InsightBox({
  text,
  className = "",
  templateId = "executive",
  label = "Insight",
  bodyClassName = "",
}: InsightBoxProps) {
  const tone = getTemplateTone(templateId);
  const modern = templateId === "modern";

  return (
    <div className={`min-h-0 rounded-[26px] border p-5 ${modern ? tone.insight : tone.card} ${className}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${modern ? tone.insightTitle : tone.accent}`}>
        {label}
      </p>
      <p
        className={`mt-3 max-w-none overflow-hidden text-[0.92rem] leading-6 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:6] ${modern ? tone.insightBody : tone.subtitle} ${bodyClassName}`}
      >
        {text}
      </p>
    </div>
  );
}
