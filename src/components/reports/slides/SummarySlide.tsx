"use client";

import { SlideCanvas } from "@/components/reports/SlideCanvas";
import { InsightBox } from "@/components/reports/primitives/InsightBox";
import { KPICard, KPIGrid } from "@/components/reports/primitives/KPIGrid";
import { SlideHeaderLogo } from "@/components/reports/slides/shared";
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
  const aiSummaryText = model.aiSummary || "Dato no disponible en este momento.";
  const recommendationText =
    model.recommendation || "Dato no disponible en este momento.";

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
          <SlideHeaderLogo
            logoUrl={model.branding.logoUrl}
            brandName={model.branding.brandName}
            workspaceId={model.branding.workspaceId}
            slideNumber={slideId}
            dark={tone.dark}
            watermarkEnabled={model.branding.watermarkEnabled}
            watermarkLabel={model.branding.watermarkLabel}
            watermarkLogoLightUrl={model.branding.watermarkLogoLightUrl}
            watermarkLogoDarkUrl={model.branding.watermarkLogoDarkUrl}
          />
          <h2
            className={`${
              model.branding.watermarkEnabled ? "mt-[14px]" : "mt-3"
            } text-[2.6rem] font-semibold tracking-[-0.06em] ${tone.title}`}
          >
            {model.title}
          </h2>
        </div>

        <KPIGrid columns={4}>
          {model.metrics.map((metric) => (
            <KPICard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              meta={metric.meta}
              className="h-[152px]"
              templateId={templateId}
            />
          ))}
        </KPIGrid>

        <div className="grid min-h-0 flex-1 grid-cols-[1.08fr_0.92fr] gap-5">
          <InsightBox
            text={aiSummaryText}
            label="Final AI Interpretation"
            className="min-h-0 max-h-[228px]"
            bodyClassName="leading-[1.62]"
            clampLines={6}
            templateId={templateId}
          />

          <div className={`relative isolate min-h-0 max-h-[228px] overflow-hidden rounded-[26px] border p-5 ${tone.card}`}>
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-cyan-300/10 blur-2xl" />
            <div className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] ${
                  tone.dark
                    ? "border-white/10 bg-white/8 text-white/85"
                    : "border-slate-200 bg-white text-slate-800"
                }`}
              >
                AI
              </span>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.accent}`}>
                Recommendation
              </p>
            </div>
            <p className={`mt-4 overflow-hidden text-[0.92rem] leading-[1.62] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:6] ${tone.subtitle}`}>
              {recommendationText}
            </p>
          </div>
        </div>
      </div>
    </SlideCanvas>
  );
}
