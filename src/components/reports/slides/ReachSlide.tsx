"use client";

import { ChartBlock } from "@/components/reports/primitives/ChartBlock";
import { InsightBox } from "@/components/reports/primitives/InsightBox";
import { KPICard, KPIGrid } from "@/components/reports/primitives/KPIGrid";
import { SlideCanvas } from "@/components/reports/SlideCanvas";
import { getTemplateTone } from "@/components/reports/slides/template";
import { MetricDailyChart, SlideHeaderLogo } from "@/components/reports/slides/shared";
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
  const metricKey = model.metricKey || "reach";
  const placeholderText =
    model.unavailableMessage ||
    "Daily series is not available for this metric yet.";
  const insightText = model.isAvailable
    ? model.insightText || "Dato no disponible en este momento."
    : model.unavailableMessage ||
      "Dato no disponible en este momento con los permisos actuales de Meta.";

  if (process.env.NODE_ENV === "development") {
    console.log("[5-slide metric slide]", {
      slideNumber: slideId,
      metricKey,
      title: model.metricTitle,
      total: model.totalValue,
      dailySeriesLength: model.chartPoints.length,
      values: model.chartPoints.map((point) => point.value),
    });
  }

  return (
    <SlideCanvas
      index={slideId}
      eyebrow={eyebrow}
      title={title}
      renderMode={renderMode}
      templateId={templateId}
    >
      <div className="grid h-full min-h-0 grid-cols-[346px_minmax(0,1fr)] gap-6">
        <div className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)]">
          <SlideHeaderLogo
            logoUrl={model.branding.logoUrl}
            brandName={model.branding.brandName}
            slideNumber={slideId}
            dark={tone.dark}
          />
          <div className="mt-4">
            <h2 className={`max-w-[14rem] text-4xl font-semibold tracking-[-0.05em] ${tone.title}`}>
              {model.metricTitle}
            </h2>
            <p className={`mt-2 text-xs ${tone.subtle}`}>{model.sourceCaption}</p>
            <p className={`mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.subtle}`}>
              {model.totalLabel}
            </p>
            <p className={`mt-3 break-words text-[3.2rem] font-semibold tracking-[-0.06em] ${tone.title}`}>
              {model.isAvailable ? model.totalValue : "N/A"}
            </p>
            {!model.isAvailable && model.unavailableMessage ? (
              <p className={`mt-2 text-sm leading-6 ${tone.subtle}`}>
                {model.unavailableMessage}
              </p>
            ) : null}
          </div>
          <InsightBox
            text={insightText}
            label="AI INSIGHT"
            className="mt-7 max-h-[214px]"
            bodyClassName="leading-[1.62]"
            clampLines={5}
            templateId={templateId}
          />
        </div>

        <ChartBlock className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4">
          <MetricDailyChart
            points={model.chartPoints}
            isAvailable={model.isAvailable && model.chartPoints.length > 0}
            metricLabel={model.chartMetricLabel}
            dark={tone.dark}
            slideNumber={slideId}
            metricKey={metricKey}
            placeholderText={placeholderText}
          />
          {model.isAvailable ? (
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
          ) : null}
        </ChartBlock>
      </div>
    </SlideCanvas>
  );
}
