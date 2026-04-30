"use client";

import { ChartBlock } from "@/components/reports/primitives/ChartBlock";
import { InsightBox } from "@/components/reports/primitives/InsightBox";
import { KPICard, KPIGrid } from "@/components/reports/primitives/KPIGrid";
import { SlideCanvas } from "@/components/reports/SlideCanvas";
import { MetricDailyChart } from "@/components/reports/slides/shared";
import type { ReachSlideModel, SlideComponentProps } from "@/components/reports/slides/types";

export function ReachSlide({
  slideId,
  eyebrow,
  title,
  renderMode,
  model,
}: SlideComponentProps<ReachSlideModel>) {
  return (
    <SlideCanvas
      index={slideId}
      eyebrow={eyebrow}
      title={title}
      renderMode={renderMode}
    >
      <div className="h-full rounded-[32px] border border-white/10 bg-white/[0.04] p-7">
        <div className="grid h-full grid-cols-[346px_minmax(0,1fr)] gap-6">
          <div className="grid min-h-0 grid-rows-[auto_auto_1fr]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">
              {model.metricEyebrow}
            </p>
            <div className="mt-4">
              <h2 className="max-w-[14rem] text-4xl font-semibold tracking-[-0.05em] text-white">
                {model.metricTitle}
              </h2>
              <p className="mt-2 text-xs text-slate-400">{model.sourceCaption}</p>
              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {model.totalLabel}
              </p>
              <p className="mt-3 break-words text-[3.2rem] font-semibold tracking-[-0.06em] text-white">
                {model.totalValue}
              </p>
            </div>
            <InsightBox text={model.insightText} className="mt-8 h-full min-h-0" />
          </div>

          <ChartBlock>
            <MetricDailyChart
              points={model.chartPoints}
              isAvailable={model.chartAvailable}
              metricLabel={model.chartMetricLabel}
              dark
            />
            <KPIGrid columns={2}>
              <KPICard
                label={model.highestDayCard.label}
                value={model.highestDayCard.value}
                meta={model.highestDayCard.meta}
              />
              <KPICard
                label={model.lowestDayCard.label}
                value={model.lowestDayCard.value}
                meta={model.lowestDayCard.meta}
              />
            </KPIGrid>
          </ChartBlock>
        </div>
      </div>
    </SlideCanvas>
  );
}
