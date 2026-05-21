"use client";

import { getTemplateTone, isLightTemplate } from "@/components/reports/slides/template";
import { SlideCanvas } from "@/components/reports/SlideCanvas";
import { CoverLogo } from "@/components/reports/slides/shared";
import type { CoverSlideModel, SlideComponentProps } from "@/components/reports/slides/types";
import { REPORT_SLIDE_THEME } from "@/lib/reports/theme";

function ModernCover({
  slideId,
  renderMode,
  model,
}: {
  slideId: string;
  renderMode: "preview" | "export";
  model: CoverSlideModel;
}) {
  const tone = getTemplateTone("modern");
  const slideClassName = renderMode === "export" ? "report-pdf-slide" : "report-preview-slide";
  const frameClassName =
    renderMode === "export"
      ? slideClassName
      : `${slideClassName} ${REPORT_SLIDE_THEME.radius.outerFrame} border ${REPORT_SLIDE_THEME.colors.frameBorder} ${REPORT_SLIDE_THEME.colors.frameBackground} ${REPORT_SLIDE_THEME.spacing.outerPadding} ${REPORT_SLIDE_THEME.effects.outerShadow}`;
  const shellWidth =
    renderMode === "export"
      ? REPORT_SLIDE_THEME.slide.width
      : REPORT_SLIDE_THEME.slide.surfaceWidth;
  const shellHeight =
    renderMode === "export"
      ? REPORT_SLIDE_THEME.slide.height
      : REPORT_SLIDE_THEME.slide.surfaceHeight;
  const heroCircleSize = 352;
  const heroCircleInset = 76;
  const accentCircleSize = 408;
  const circleClusterRight = 96;

  return (
    <section
      data-report-slide={slideId}
      className={frameClassName}
      style={{
        width: REPORT_SLIDE_THEME.slide.width,
        minWidth: REPORT_SLIDE_THEME.slide.width,
        maxWidth: REPORT_SLIDE_THEME.slide.width,
        height: REPORT_SLIDE_THEME.slide.height,
        minHeight: REPORT_SLIDE_THEME.slide.height,
        maxHeight: REPORT_SLIDE_THEME.slide.height,
        fontFamily: "var(--font-sans)",
        fontKerning: "normal",
        fontSynthesis: "none",
        textRendering: "geometricPrecision",
      }}
    >
      <div
        className={`mx-auto max-w-none overflow-hidden ${renderMode === "export" ? "" : "rounded-[32px] border border-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_42px_rgba(37,99,235,0.12)]"} bg-white`}
        style={{
          width: shellWidth,
          height: shellHeight,
          boxSizing: "border-box",
          margin: renderMode === "export" ? 0 : "0 auto",
        }}
      >
        <div className={`relative h-full overflow-hidden ${tone.shellBackground}`}>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.30),transparent_40%,rgba(191,219,254,0.10)_100%)]" />

          <div
            className="absolute inset-y-0 left-0 w-[54%] bg-[linear-gradient(135deg,#4f6df2_0%,#5473f0_42%,#5c79f5_100%)] shadow-[18px_0_48px_rgba(79,109,242,0.18)]"
            style={{
              clipPath: "polygon(0 0, 76% 0, 100% 50%, 76% 100%, 0 100%)",
            }}
          />

          <div
            className="pointer-events-none absolute left-[48.8%] top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[44px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.74),rgba(255,255,255,0.26))] shadow-[0_16px_36px_rgba(148,163,184,0.12)] backdrop-blur-[1px]"
            style={{
              width: "144px",
              height: "468px",
              clipPath: "polygon(24% 0, 100% 12%, 74% 50%, 100% 88%, 24% 100%, 0 50%)",
            }}
          />
          <div
            className="pointer-events-none absolute top-1/2 -translate-y-1/2"
            style={{
              right: `${circleClusterRight}px`,
              width: `${accentCircleSize}px`,
              height: `${accentCircleSize}px`,
            }}
          >
            <div className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,#4f6df2_0%,#5c79f5_100%)]" />
            <div
              className="absolute left-1/2 top-1/2 rounded-full border border-slate-100 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,1),rgba(239,246,255,0.98)_55%,rgba(219,234,254,0.88)_100%)] shadow-[0_22px_56px_rgba(148,163,184,0.24)]"
              style={{
                width: `${heroCircleSize}px`,
                height: `${heroCircleSize}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {model.branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={model.branding.logoUrl}
                  alt="Brand visual"
                  className="h-full w-full object-contain"
                  style={{
                    padding: `${heroCircleInset}px`,
                  }}
                />
              ) : (
                <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_52%,#bfdbfe_100%)]">
                  <div className="absolute inset-x-[22%] top-[20%] h-[58%] rounded-[34px] bg-white/92 shadow-[0_12px_36px_rgba(125,211,252,0.32)]" />
                  <div className="absolute left-[18%] top-[24%] h-[46%] w-[62%] rounded-[28px] border border-sky-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(224,242,254,0.88))]" />
                  <div className="absolute left-[44%] top-[48%] h-[18%] w-[26%] rounded-full bg-sky-300/80 blur-[8px]" />
                  <div className="absolute left-[12%] top-[18%] h-[64%] w-[1px] rotate-[12deg] bg-sky-300/45" />
                </div>
              )}
            </div>
          </div>

          <div className="absolute left-[72px] top-[74px] right-[72px] bottom-[74px] grid grid-cols-[0.94fr_1.06fr]">
            <div className="flex h-full flex-col justify-between pr-16 text-white">
              <div className="space-y-10">
                <div className="flex items-center gap-4">
                  <p className="text-[1.35rem] font-medium tracking-[-0.03em] text-white/95">
                    Marketing report
                  </p>
                </div>

                <div className="max-w-[29rem]">
                  <h1 className="text-[4.85rem] font-semibold leading-[0.94] tracking-[-0.07em] text-white">
                    {model.reportTitle}
                  </h1>
                </div>
              </div>

              <div>
                <p className="text-[1.05rem] font-medium text-white/85">Report period</p>
                <p className="mt-3 text-[1.1rem] font-medium tracking-[0.02em] text-white/95">
                  {model.meta}
                </p>
                <p className="mt-8 text-[1.05rem] font-medium tracking-[0.01em] text-white/92">
                  {model.branding.brandName}
                </p>
              </div>
            </div>
            <div className="relative h-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function CoverSlide({
  slideId,
  eyebrow,
  title,
  renderMode,
  templateId,
  model,
}: SlideComponentProps<CoverSlideModel>) {
  const tone = getTemplateTone(templateId);

  if (templateId === "modern") {
    return <ModernCover slideId={slideId} renderMode={renderMode} model={model} />;
  }

  return (
    <SlideCanvas
      index={slideId}
      eyebrow={eyebrow}
      title={title}
      renderMode={renderMode}
      templateId={templateId}
    >
      <div className="relative h-full">
        <div className="flex h-full max-w-[38rem] flex-col justify-center pr-10">
          <h1
            className={`max-w-none text-[4.6rem] font-semibold leading-[0.92] tracking-[-0.05em] ${tone.title}`}
          >
            {model.reportTitle}
          </h1>
          <div className={`mt-5 h-px w-28 ${tone.divider}`} />
          {model.subtitle ? (
            <p className={`mt-5 text-[1.4rem] ${tone.subtitle}`}>{model.subtitle}</p>
          ) : null}
          {model.meta ? (
            <p className={`mt-4 text-[0.95rem] font-medium uppercase tracking-[0.18em] ${tone.accent}`}>
              {model.meta}
            </p>
          ) : null}
        </div>

        <div className="absolute bottom-0 left-0 max-w-[34rem]">
          <p
            className={`text-[1rem] font-medium tracking-[0.01em] ${
              isLightTemplate(templateId) ? tone.body : "text-white/92"
            }`}
          >
            {model.branding.brandName}
          </p>
        </div>

        <CoverLogo
          logoDataUrl={model.branding.logoUrl}
          dark={!isLightTemplate(templateId)}
        />
      </div>
    </SlideCanvas>
  );
}
