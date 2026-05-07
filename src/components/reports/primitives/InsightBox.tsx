"use client";

import type { ReportTemplateId } from "@/lib/reports/template-selection";
import { getTemplateTone } from "@/components/reports/slides/template";

type InsightBoxProps = {
  text: string;
  className?: string;
  templateId?: ReportTemplateId;
};

export function InsightBox({
  text,
  className = "",
  templateId = "executive",
}: InsightBoxProps) {
  const tone = getTemplateTone(templateId);
  const modern = templateId === "modern";

  return (
    <div className={`rounded-[26px] border p-6 ${modern ? tone.insight : tone.card} ${className}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${modern ? tone.insightTitle : tone.accent}`}>
        Insight
      </p>
      <p className={`mt-4 max-w-none text-[15px] leading-7 ${modern ? tone.insightBody : tone.subtitle}`}>
        {text}
      </p>
    </div>
  );
}
