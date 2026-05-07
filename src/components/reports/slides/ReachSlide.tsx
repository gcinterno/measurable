"use client";

import { ChartBlock } from "@/components/reports/primitives/ChartBlock";
import { InsightBox } from "@/components/reports/primitives/InsightBox";
import { KPICard, KPIGrid } from "@/components/reports/primitives/KPIGrid";
import { SlideCanvas } from "@/components/reports/SlideCanvas";
import { getTemplateTone } from "@/components/reports/slides/template";
import { MetricDailyChart } from "@/components/reports/slides/shared";
import type { ReachSlideModel, SlideComponentProps } from "@/components/reports/slides/types";

export function ReachSlide({
  slideId,
  eyebrow,
  title,
  renderMode,
  templateId,
  model,
}: SlideComponentProps<ReachSlideModel>) {
  const tone = getTemplateTone(templateId);

  return (
    <SlideCanvas
      index={slideId}
      eyebrow={eyebrow}
      title={title}
      renderMode={renderMode}
      templateId={templateId}
    >
      <div className={`h-full rounded-[32px] border p-7 ${tone.card}`}>
        <div className="grid h-full grid-cols-[346px_minmax(0,1fr)] gap-6">
          <div className="grid min-h-0 grid-rows-[auto_auto_1fr]">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${tone.accent}`}>
              {model.metricEyebrow}
            </p>
            <div className="mt-4">
              <h2 className={`max-w-[14rem] text-4xl font-semibold tracking-[-0.05em] ${tone.title}`}>
                {model.metricTitle}
              </h2>
              <p className={`mt-2 text-xs ${tone.subtle}`}>{model.sourceCaption}</p>
              <p className={`mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.subtle}`}>
                {model.totalLabel}
              </p>
              <p className={`mt-3 break-words text-[3.2rem] font-semibold tracking-[-0.06em] ${tone.title}`}>
                {model.totalValue}
              </p>
            </div>
            <InsightBox
              text={model.insightText}
              className="mt-8 h-full min-h-0"
              templateId={templateId}
            />
          </div>

          <ChartBlock>
            <MetricDailyChart
              points={model.chartPoints}
              isAvailable={model.chartAvailable}
              metricLabel={model.chartMetricLabel}
              dark={templateId !== "modern"}
            />
            <KPIGrid columns={2}>
              <KPICard
                label={model.highestDayCard.label}
                value={model.highestDayCard.value}
                meta={model.highestDayCard.meta}
                templateId={templateId}
              />
              <KPICard
                label={model.lowestDayCard.label}
                value={model.lowestDayCard.value}
                meta={model.lowestDayCard.meta}
                templateId={templateId}
              />
            </KPIGrid>
          </ChartBlock>
        </div>
      </div>
    </SlideCanvas>
  );
}
