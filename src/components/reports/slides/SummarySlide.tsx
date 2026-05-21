"use client";

import { SlideCanvas } from "@/components/reports/SlideCanvas";
import { InsightBox } from "@/components/reports/primitives/InsightBox";
import { KPICard, KPIGrid } from "@/components/reports/primitives/KPIGrid";
import { getTemplateTone } from "@/components/reports/slides/template";
import type { SlideComponentProps, SummarySlideModel } from "@/components/reports/slides/types";

/*
 * Official 5-slide summary slide.
 * Source of truth for Slide 5 is SummarySlide via lib/reports/templates/default.ts.
 */
export function SummarySlide({
  slideId,
  eyebrow,
  title,
  renderMode,
  templateId,
  model,
}: SlideComponentProps<SummarySlideModel>) {
  const tone = getTemplateTone(templateId);

  return (
    <SlideCanvas
      index={slideId}
      eyebrow={eyebrow}
      title={title}
      renderMode={renderMode}
      templateId={templateId}
    >
      <div className="flex h-full min-h-0 flex-col gap-6">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${tone.accent}`}>
            Summary
          </p>
          <h2 className={`mt-3 text-[2.6rem] font-semibold tracking-[-0.06em] ${tone.title}`}>
            {model.title}
          </h2>
        </div>

        <KPIGrid columns={3}>
          {model.metrics.map((metric) => (
            <KPICard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              meta={metric.meta}
              className="h-[138px]"
              templateId={templateId}
            />
          ))}
        </KPIGrid>

        <div className="grid min-h-0 flex-1 grid-cols-[1.08fr_0.92fr] gap-5">
          <InsightBox
            text={model.aiSummary}
            label="Final AI Interpretation"
            className="min-h-0 max-h-[240px]"
            templateId={templateId}
          />

          <div className={`min-h-0 rounded-[26px] border p-5 ${tone.card}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.accent}`}>
              Recommendation
            </p>
            <p className={`mt-3 overflow-hidden text-[0.92rem] leading-6 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:6] ${tone.subtitle}`}>
              {model.recommendation}
            </p>
          </div>
        </div>
      </div>
    </SlideCanvas>
  );
}
