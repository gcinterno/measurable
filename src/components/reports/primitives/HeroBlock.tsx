"use client";

import type { ReactNode } from "react";

import type { ReportTemplateId } from "@/lib/reports/template-selection";
import { getTemplateTone } from "@/components/reports/slides/template";

type HeroBlockProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  footer?: ReactNode;
  rightSlot?: ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
  className?: string;
  templateId?: ReportTemplateId;
};

export function HeroBlock({
  eyebrow,
  title,
  subtitle,
  meta,
  footer,
  rightSlot,
  titleClassName = "text-[4.6rem]",
  subtitleClassName = "text-[1.4rem]",
  className = "max-w-[38rem]",
  templateId = "executive",
}: HeroBlockProps) {
  const tone = getTemplateTone(templateId);

  return (
    <div className="relative h-full">
      <div className={`flex h-full flex-col justify-center pr-10 ${className}`}>
        {eyebrow ? (
          <p className={`text-[0.95rem] font-medium uppercase tracking-[0.18em] ${tone.accent}`}>
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={`max-w-none font-semibold leading-[0.92] tracking-[-0.05em] ${tone.title} ${titleClassName}`}
        >
          {title}
        </h1>
        <div className={`mt-5 h-px w-28 ${tone.divider}`} />
        {subtitle ? (
          <p className={`mt-5 ${tone.subtitle} ${subtitleClassName}`}>{subtitle}</p>
        ) : null}
        {meta ? (
          <p className={`mt-4 text-[0.95rem] font-medium uppercase tracking-[0.18em] ${tone.accent}`}>
            {meta}
          </p>
        ) : null}
        {footer}
      </div>

      {rightSlot}
    </div>
  );
}
