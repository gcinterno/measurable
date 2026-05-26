"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

import { getTemplateTone, isLightTemplate } from "@/components/reports/slides/template";
import { SlideCanvas } from "@/components/reports/SlideCanvas";
import { CoverLogo } from "@/components/reports/slides/shared";
import type { CoverSlideModel, SlideComponentProps } from "@/components/reports/slides/types";
import { API_URL } from "@/lib/api/config";
import { resolveAssetUrl } from "@/lib/reports/branding";
import { REPORT_SLIDE_THEME } from "@/lib/reports/theme";

function getExportSlideNumber(slideId: string) {
  const parsed = Number.parseInt(slideId, 10);

  if (Number.isFinite(parsed) && parsed > 0) {
    return String(parsed);
  }

  return slideId.replace(/^0+/, "") || slideId;
}

function CoverBrandImage({
  src,
  alt,
  className,
  imageClassName,
  workspaceId,
  style,
  fallback,
  reportId,
  renderMode,
}: {
  src: string;
  alt: string;
  className: string;
  imageClassName?: string;
  workspaceId?: string | null;
  style?: CSSProperties;
  fallback: ReactNode;
  reportId?: string | null;
  renderMode?: "preview" | "export";
}) {
  const [failed, setFailed] = useState(false);
  const resolvedLogoUrl = resolveAssetUrl(src, API_URL, { workspaceId }) || "";

  if (failed || !resolvedLogoUrl.trim()) {
    return <>{fallback}</>;
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[report-logo]", {
      rawLogoUrl: src,
      resolvedLogoUrl,
      workspaceId: workspaceId || null,
    });
  }

  return (
    <div className={className} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedLogoUrl}
        alt={alt}
        data-report-logo="true"
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        className={imageClassName || "block h-full w-full object-contain object-center"}
        onError={(event) => {
          console.warn("[COVER_LOGO_ERROR]", {
            src: src || null,
            normalizedSrc: resolvedLogoUrl || null,
            reportId: reportId || null,
            renderMode: renderMode || null,
            workspaceId: workspaceId || null,
            error: event?.currentTarget?.currentSrc || "image-error",
          });
          setFailed(true);
        }}
      />
    </div>
  );
}

function useCoverExportAudit({
  renderMode,
  reportId,
  slideId,
  model,
  sectionRef,
  frameRef,
}: {
  renderMode: "preview" | "export";
  reportId?: string;
  slideId: string;
  model: CoverSlideModel;
  sectionRef: RefObject<HTMLElement | null>;
  frameRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    if (renderMode !== "export") {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      const section = sectionRef.current;
      const frame = frameRef.current;
      const logoElement = frame?.querySelector<HTMLImageElement>("img[data-report-logo='true']");
      const logoRect = logoElement?.getBoundingClientRect() || null;
      const frameRect = frame?.getBoundingClientRect() || null;
      const slideRect = section?.getBoundingClientRect() || null;

      console.info("[COVER_RENDER_AUDIT_EXPORT]", {
        renderMode,
        reportId: reportId || null,
        slideNumber: slideId,
        coverTitle: model.reportTitle || null,
        coverSubtitle: model.subtitle || null,
        coverLogoUrl: model.branding.logoUrl || null,
        resolvedLogoSrc: logoElement?.currentSrc || logoElement?.src || null,
        logoElementExists: Boolean(logoElement),
        logoNaturalWidth: logoElement?.naturalWidth ?? null,
        logoNaturalHeight: logoElement?.naturalHeight ?? null,
        logoClientWidth: logoElement?.clientWidth ?? null,
        logoClientHeight: logoElement?.clientHeight ?? null,
        logoBoundingClientRect: logoRect
          ? {
              x: logoRect.x,
              y: logoRect.y,
              width: logoRect.width,
              height: logoRect.height,
              top: logoRect.top,
              right: logoRect.right,
              bottom: logoRect.bottom,
              left: logoRect.left,
            }
          : null,
        frameBoundingClientRect: frameRect
          ? {
              x: frameRect.x,
              y: frameRect.y,
              width: frameRect.width,
              height: frameRect.height,
              top: frameRect.top,
              right: frameRect.right,
              bottom: frameRect.bottom,
              left: frameRect.left,
            }
          : null,
        slideBoundingClientRect: slideRect
          ? {
              x: slideRect.x,
              y: slideRect.y,
              width: slideRect.width,
              height: slideRect.height,
              top: slideRect.top,
              right: slideRect.right,
              bottom: slideRect.bottom,
              left: slideRect.left,
            }
          : null,
      });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [frameRef, model.branding.logoUrl, model.reportTitle, model.subtitle, renderMode, reportId, sectionRef, slideId]);
}

function ModernCover({
  slideId,
  renderMode,
  reportId,
  model,
}: {
  slideId: string;
  renderMode: "preview" | "export";
  reportId?: string;
  model: CoverSlideModel;
}) {
  const tone = getTemplateTone("modern");
  const sectionRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const slideClassName = "report-preview-slide";
  const frameClassName = `${slideClassName} ${REPORT_SLIDE_THEME.radius.outerFrame} border ${REPORT_SLIDE_THEME.colors.frameBorder} ${REPORT_SLIDE_THEME.colors.frameBackground} ${REPORT_SLIDE_THEME.spacing.outerPadding} ${REPORT_SLIDE_THEME.effects.outerShadow}`;
  const shellWidth = REPORT_SLIDE_THEME.slide.surfaceWidth;
  const shellHeight = REPORT_SLIDE_THEME.slide.surfaceHeight;
  const heroCircleSize = 352;
  const heroCircleInset = 76;
  const accentCircleSize = 408;
  const circleClusterRight = 96;

  useCoverExportAudit({
    renderMode,
    reportId,
    slideId,
    model,
    sectionRef,
    frameRef,
  });

  useEffect(() => {
    if (renderMode !== "export") {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      const section = sectionRef.current;
      const frame = frameRef.current;

      console.info("[PDF_EXPORT_VISUAL_AUDIT][slide]", {
        index: slideId,
        title: model.reportTitle,
        pageWidth: section?.offsetWidth ?? null,
        pageHeight: section?.offsetHeight ?? null,
        frameWidth: frame?.offsetWidth ?? null,
        frameHeight: frame?.offsetHeight ?? null,
        slideWidth: frame?.scrollWidth ?? null,
        slideHeight: frame?.scrollHeight ?? null,
        scrollWidth: section?.scrollWidth ?? null,
        scrollHeight: section?.scrollHeight ?? null,
      });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [model.reportTitle, renderMode, slideId]);

  return (
    <section
      ref={sectionRef}
      data-report-slide={renderMode === "export" ? "true" : slideId}
      data-slide-number={getExportSlideNumber(slideId)}
      data-pdf-page={renderMode === "export" ? "true" : undefined}
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
        ref={frameRef}
        data-pdf-slide-frame={renderMode === "export" ? "true" : undefined}
        className={`mx-auto max-w-none overflow-hidden rounded-[32px] border border-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_42px_rgba(37,99,235,0.12)] bg-white`}
        style={{
          width: shellWidth,
          height: shellHeight,
          boxSizing: "border-box",
          margin: "0 auto",
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
              className="absolute left-1/2 top-1/2 overflow-hidden rounded-full border border-slate-100 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,1),rgba(239,246,255,0.98)_55%,rgba(219,234,254,0.88)_100%)] shadow-[0_22px_56px_rgba(148,163,184,0.24)]"
              style={{
                width: `${heroCircleSize}px`,
                height: `${heroCircleSize}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {model.branding.logoUrl ? (
                <CoverBrandImage
                  src={model.branding.logoUrl}
                  alt="Brand visual"
                  workspaceId={model.branding.workspaceId}
                  reportId={reportId || null}
                  renderMode={renderMode}
                  className="h-full w-full overflow-hidden flex items-center justify-center"
                  imageClassName="block h-full w-full object-contain object-center"
                  style={{
                    padding: `${heroCircleInset}px`,
                  }}
                  fallback={
                    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_52%,#bfdbfe_100%)]">
                      <div className="absolute inset-x-[22%] top-[20%] h-[58%] rounded-[34px] bg-white/92 shadow-[0_12px_36px_rgba(125,211,252,0.32)]" />
                      <div className="absolute left-[18%] top-[24%] h-[46%] w-[62%] rounded-[28px] border border-sky-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(224,242,254,0.88))]" />
                      <div className="absolute left-[44%] top-[48%] h-[18%] w-[26%] rounded-full bg-sky-300/80 blur-[8px]" />
                      <div className="absolute left-[12%] top-[18%] h-[64%] w-[1px] rotate-[12deg] bg-sky-300/45" />
                    </div>
                  }
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
                    {model.reportHeading || "Marketing Report"}
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

function SimpleCover({
  slideId,
  renderMode,
  reportId,
  model,
}: {
  slideId: string;
  renderMode: "preview" | "export";
  reportId?: string;
  model: CoverSlideModel;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const slideClassName = "report-preview-slide";
  const frameClassName = `${slideClassName} ${REPORT_SLIDE_THEME.radius.outerFrame} border ${REPORT_SLIDE_THEME.colors.frameBorder} ${REPORT_SLIDE_THEME.colors.frameBackground} ${REPORT_SLIDE_THEME.spacing.outerPadding} ${REPORT_SLIDE_THEME.effects.outerShadow}`;
  const shellWidth = REPORT_SLIDE_THEME.slide.surfaceWidth;
  const shellHeight = REPORT_SLIDE_THEME.slide.surfaceHeight;

  useCoverExportAudit({
    renderMode,
    reportId,
    slideId,
    model,
    sectionRef,
    frameRef,
  });

  useEffect(() => {
    if (renderMode !== "export") {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      const section = sectionRef.current;
      const frame = frameRef.current;

      console.info("[PDF_EXPORT_VISUAL_AUDIT][slide]", {
        index: slideId,
        title: model.reportTitle,
        pageWidth: section?.offsetWidth ?? null,
        pageHeight: section?.offsetHeight ?? null,
        frameWidth: frame?.offsetWidth ?? null,
        frameHeight: frame?.offsetHeight ?? null,
        slideWidth: frame?.scrollWidth ?? null,
        slideHeight: frame?.scrollHeight ?? null,
        scrollWidth: section?.scrollWidth ?? null,
        scrollHeight: section?.scrollHeight ?? null,
      });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [model.reportTitle, renderMode, slideId]);

  return (
    <section
      ref={sectionRef}
      data-report-slide={renderMode === "export" ? "true" : slideId}
      data-slide-number={getExportSlideNumber(slideId)}
      data-pdf-page={renderMode === "export" ? "true" : undefined}
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
        ref={frameRef}
        data-pdf-slide-frame={renderMode === "export" ? "true" : undefined}
        className={`mx-auto max-w-none overflow-hidden rounded-[32px] border border-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_18px_42px_rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#f8fbff_0%,#f3f6fa_100%)]`}
        style={{
          width: shellWidth,
          height: shellHeight,
          boxSizing: "border-box",
          margin: "0 auto",
        }}
      >
        <div className="relative grid h-full grid-cols-[0.55fr_0.45fr] overflow-hidden bg-[linear-gradient(180deg,#f7fafc_0%,#f2f5f9_100%)]">
          <div className="relative border-r border-[#E6EBF2] bg-[linear-gradient(180deg,#f2f5f8_0%,#edf1f5_100%)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.12),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.42),rgba(255,255,255,0)_45%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-[84px] rounded-t-[26px] bg-[linear-gradient(180deg,rgba(218,225,236,0.88)_0%,rgba(212,219,231,0.96)_100%)]" />

            <div className="relative flex h-full flex-col px-[52px] pb-[92px] pt-[52px]">
              <p className="text-[1rem] font-semibold uppercase tracking-[0.28em] text-[#2B83D7]">
                {model.reportHeading || "Marketing Report"}
              </p>
              <div className="max-w-[31rem] rounded-[28px] bg-[linear-gradient(180deg,rgba(245,248,252,0.95)_0%,rgba(236,241,246,0.92)_100%)] px-[30px] py-[34px] shadow-[0_10px_24px_rgba(148,163,184,0.10)]">
                <h1 className="text-[5rem] font-semibold leading-[0.9] tracking-[-0.08em] text-black">
                  {model.reportTitle}
                </h1>
              </div>

              <div className="mt-auto max-w-[38rem]">
                {model.subtitle ? (
                  <p className="text-[1.1rem] font-normal tracking-[-0.02em] text-[#7084A0]">
                    {model.subtitle}
                  </p>
                ) : null}
                {model.meta ? (
                  <p className="mt-5 text-[0.9rem] font-medium uppercase tracking-[0.28em] text-[#2B83D7]">
                    {model.meta}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.82))]" />
            <div className="absolute right-[34px] top-[26px] h-3 w-12 rounded-full bg-slate-100/70" />
            <div className="absolute right-[18px] top-[20px] text-[0.95rem] uppercase tracking-[0.12em] text-slate-100">
              {model.branding.brandName}
            </div>

            <div className="relative flex h-full items-center justify-center px-16">
              {model.branding.logoUrl ? (
                <CoverBrandImage
                  src={model.branding.logoUrl}
                  alt="Brand visual"
                  workspaceId={model.branding.workspaceId}
                  reportId={reportId || null}
                  renderMode={renderMode}
                  className="flex h-full w-full items-center justify-center overflow-hidden"
                  imageClassName="block max-h-[64%] max-w-[76%] object-contain object-center drop-shadow-[0_18px_30px_rgba(59,130,246,0.12)]"
                  fallback={
                    <div className="relative h-[290px] w-[290px]">
                      <div className="absolute inset-[18%] rounded-[36px] bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_100%)] opacity-95" />
                      <div className="absolute left-[18%] top-[14%] h-[58%] w-[18%] rounded-[20px] bg-[#2563eb]" />
                      <div className="absolute right-[18%] top-[14%] h-[70%] w-[18%] rounded-[20px] bg-[#2563eb]" />
                      <div className="absolute left-[28%] top-[34%] h-[18%] w-[44%] rotate-[-39deg] rounded-[18px] bg-[#1d4ed8]" />
                      <div className="absolute right-[10%] top-[56%] h-[18%] w-[34%] rotate-[-48deg] rounded-[18px] bg-[#2563eb]" />
                    </div>
                  }
                />
              ) : (
                <div className="relative h-[290px] w-[290px]">
                  <div className="absolute inset-[18%] rounded-[36px] bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_100%)] opacity-95" />
                  <div className="absolute left-[18%] top-[14%] h-[58%] w-[18%] rounded-[20px] bg-[#2563eb]" />
                  <div className="absolute right-[18%] top-[14%] h-[70%] w-[18%] rounded-[20px] bg-[#2563eb]" />
                  <div className="absolute left-[28%] top-[34%] h-[18%] w-[44%] rotate-[-39deg] rounded-[18px] bg-[#1d4ed8]" />
                  <div className="absolute right-[10%] top-[56%] h-[18%] w-[34%] rotate-[-48deg] rounded-[18px] bg-[#2563eb]" />
                </div>
              )}
            </div>
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
  reportId,
  model,
}: SlideComponentProps<CoverSlideModel>) {
  const tone = getTemplateTone(templateId);

  if (templateId === "modern") {
    return <ModernCover slideId={slideId} renderMode={renderMode} reportId={reportId} model={model} />;
  }

  if (templateId === "simple") {
    return <SimpleCover slideId={slideId} renderMode={renderMode} reportId={reportId} model={model} />;
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
          <p className={`text-[1rem] font-semibold uppercase tracking-[0.28em] ${tone.accent}`}>
            {model.reportHeading || "Marketing Report"}
          </p>
          <h1
            className={`mt-4 max-w-none text-[4.6rem] font-semibold leading-[0.92] tracking-[-0.05em] ${tone.title}`}
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
                  workspaceId={model.branding.workspaceId}
                  dark={!isLightTemplate(templateId)}
                />
      </div>
    </SlideCanvas>
  );
}
