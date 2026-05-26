"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { getTemplateTone } from "@/components/reports/slides/template";
import type { ReportTemplateId } from "@/lib/reports/template-selection";
import {
  REPORT_SLIDE_THEME,
  type ReportRenderMode,
} from "@/lib/reports/theme";

const PDF_EXPORT_CONTENT_WIDTH = REPORT_SLIDE_THEME.slide.surfaceWidth;
const PDF_EXPORT_CONTENT_HEIGHT = REPORT_SLIDE_THEME.slide.surfaceHeight;

function getExportSlideNumber(index: string) {
  const parsed = Number.parseInt(index, 10);

  if (Number.isFinite(parsed) && parsed > 0) {
    return String(parsed);
  }

  return index.replace(/^0+/, "") || index;
}

type SlideCanvasProps = {
  index: string;
  totalSlides?: number;
  title: string;
  eyebrow: string;
  children: ReactNode;
  renderMode?: ReportRenderMode;
  templateId?: ReportTemplateId;
  watermarkText?: string;
};

function ModernDotMatrix() {
  const dots = Array.from({ length: 12 }, (_, row) =>
    Array.from({ length: 12 }, (_, column) => {
      const x = 18 + column * 26;
      const y = 18 + row * 26;
      const radius = ((row * 3 + column * 5) % 4) + 1.6;
      const tone = (row + column) % 5;
      const fill =
        tone === 0
          ? "#0f172a"
          : tone === 1
            ? "#0284c7"
            : tone === 2
              ? "#38bdf8"
              : tone === 3
                ? "#7dd3fc"
                : "#cbd5e1";

      return { x, y, radius, fill };
    })
  ).flat();

  return (
    <svg
      aria-hidden="true"
      className="absolute bottom-[-12px] left-[-18px] h-[250px] w-[320px] opacity-90"
      viewBox="0 0 320 250"
      fill="none"
    >
      <g opacity="0.28" stroke="#cbd5e1" strokeWidth="0.8">
        {Array.from({ length: 10 }, (_, index) => (
          <path
            key={`h-${index}`}
            d={`M 0 ${30 + index * 28} H 250`}
          />
        ))}
        {Array.from({ length: 10 }, (_, index) => (
          <path
            key={`v-${index}`}
            d={`M ${18 + index * 26} 0 V 220`}
          />
        ))}
      </g>
      {dots.map((dot, index) => (
        <circle
          key={index}
          cx={dot.x}
          cy={dot.y}
          r={dot.radius}
          fill={dot.fill}
          opacity={dot.fill === "#cbd5e1" ? 0.55 : 0.9}
        />
      ))}
    </svg>
  );
}

function ModernCornerWave({
  className,
  flipX = false,
  flipY = false,
}: {
  className: string;
  flipX?: boolean;
  flipY?: boolean;
}) {
  const lines = Array.from({ length: 18 }, (_, index) => {
    const offset = index * 8.5;
    return `M ${4 - offset * 0.18} ${24 + offset}
      C ${42 + offset * 0.52} ${-2 + offset * 0.2}, ${132 + offset * 0.28} ${-8 + offset * 0.08}, ${198 + offset * 0.12} ${24 - offset * 0.04}
      C ${248 + offset * 0.06} ${50 + offset * 0.04}, ${290 - offset * 0.14} ${120 + offset * 0.3}, ${314 - offset * 0.08} ${186 + offset * 0.5}`;
  });
  const transform = `${flipX ? "scaleX(-1)" : ""} ${flipY ? "scaleY(-1)" : ""}`.trim();

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 320 190"
      fill="none"
      style={transform ? { transform } : undefined}
    >
      {lines.map((path, index) => (
        <path
          key={index}
          d={path}
          stroke="rgba(15,23,42,0.10)"
          strokeWidth="1.15"
          strokeLinecap="round"
          opacity={0.92 - index * 0.035}
        />
      ))}
    </svg>
  );
}

function ModernDiamondCluster() {
  return (
    <div className="pointer-events-none absolute bottom-[42px] right-[88px] h-[220px] w-[280px] opacity-90">
      <div className="absolute left-[28px] top-[108px] h-[132px] w-[132px] rotate-45 rounded-[28px] border-[3px] border-slate-950/90 bg-transparent" />
      <div className="absolute left-[132px] top-[28px] h-[88px] w-[88px] rotate-45 rounded-[22px] border-[3px] border-slate-950/90 bg-transparent" />
      <div className="absolute left-[164px] top-[118px] h-[112px] w-[112px] rotate-45 rounded-[26px] bg-[linear-gradient(135deg,#1d4ed8_0%,#3b82f6_100%)] shadow-[0_18px_36px_rgba(37,99,235,0.24)]" />
      <div className="absolute left-[196px] top-[52px] h-6 w-6 rounded-full bg-[#3b82f6]" />
      <div className="absolute left-[118px] top-[176px] h-5 w-5 rounded-full bg-[#facc15]" />
    </div>
  );
}

function ModernRibbon() {
  const lines = Array.from({ length: 15 }, (_, index) => {
    const offset = index * 9;
    return `M ${250 + offset * 0.45} 34
      C ${215 + offset * 0.3} 58, ${220 + offset * 0.65} 126, ${186 + offset * 0.25} 164
      C ${152 + offset * 0.2} 201, ${84 + offset * 0.25} 243, ${70 + offset * 0.15} 306
      C ${58 + offset * 0.15} 360, ${98 + offset * 0.3} 408, ${128 + offset * 0.45} 438`;
  });

  return (
    <svg
      aria-hidden="true"
      className="absolute right-[34px] top-[120px] h-[440px] w-[360px] opacity-95"
      viewBox="0 0 360 440"
      fill="none"
    >
      <defs>
        <linearGradient id="modern-ribbon-stroke" x1="320" y1="34" x2="88" y2="432" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f172a" stopOpacity="0.7" />
          <stop offset="0.38" stopColor="#0284c7" stopOpacity="0.95" />
          <stop offset="0.75" stopColor="#38bdf8" stopOpacity="0.88" />
          <stop offset="1" stopColor="#7dd3fc" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {lines.map((path, index) => (
        <path
          key={index}
          d={path}
          stroke="url(#modern-ribbon-stroke)"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity={0.92 - index * 0.03}
        />
      ))}
    </svg>
  );
}

function ModernTemplateArtwork() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 bottom-0 h-[180px] bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(186,230,253,0.08)_100%)]" />
        <div className="absolute left-[56px] top-[72px] h-[180px] w-[180px] rounded-full bg-[radial-gradient(circle,rgba(186,230,253,0.12)_0%,rgba(255,255,255,0)_72%)]" />
      </div>
      <ModernCornerWave className="absolute left-0 top-0 h-[184px] w-[320px] opacity-80" />
      <ModernCornerWave className="absolute bottom-0 right-0 h-[184px] w-[320px] opacity-80" flipX flipY />
      <ModernDotMatrix />
      <ModernRibbon />
      <ModernDiamondCluster />
    </>
  );
}

export function SlideCanvas({
  index,
  totalSlides = 5,
  title,
  eyebrow,
  children,
  renderMode = "preview",
  templateId = "executive",
  watermarkText,
}: SlideCanvasProps) {
  const hasHeaderCopy = Boolean(eyebrow || title);
  const isExportMode = renderMode === "export";
  const sectionRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const tone = getTemplateTone(templateId);
  const slideClassName = isExportMode ? "report-pdf-slide" : "report-preview-slide";
  const frameClassName = isExportMode
    ? slideClassName
    : `${slideClassName} ${REPORT_SLIDE_THEME.radius.outerFrame} border ${REPORT_SLIDE_THEME.colors.frameBorder} ${REPORT_SLIDE_THEME.colors.frameBackground} ${REPORT_SLIDE_THEME.spacing.outerPadding} ${REPORT_SLIDE_THEME.effects.outerShadow}`;
  const shellClassName = isExportMode
    ? `overflow-hidden ${tone.shellBase}`
    : `mx-auto max-w-none overflow-hidden border ${tone.dark ? REPORT_SLIDE_THEME.colors.shellBorder : "border-slate-200"} ${REPORT_SLIDE_THEME.radius.innerFrame} ${tone.shellBase} ${REPORT_SLIDE_THEME.effects.innerShadow}`;
  const shellWidth = isExportMode
    ? PDF_EXPORT_CONTENT_WIDTH
    : REPORT_SLIDE_THEME.slide.surfaceWidth;
  const shellHeight = isExportMode
    ? PDF_EXPORT_CONTENT_HEIGHT
    : REPORT_SLIDE_THEME.slide.surfaceHeight;

  useEffect(() => {
    if (!isExportMode) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      const section = sectionRef.current;
      const frame = frameRef.current;

      console.info("[PDF_EXPORT_VISUAL_AUDIT][slide]", {
        index,
        title,
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
  }, [index, isExportMode, title]);

  console.info("[AUDIT_RENDER_PATH][SlideCanvas]", {
    index,
    totalSlides,
    title,
    eyebrow,
    renderMode,
    hasChildren: Boolean(children),
    source: "children",
  });

  return (
    <section
      ref={sectionRef}
      data-report-slide={isExportMode ? "true" : index}
      data-slide-number={getExportSlideNumber(index)}
      data-pdf-page={isExportMode ? "true" : undefined}
      className={frameClassName}
      style={{
        width: REPORT_SLIDE_THEME.slide.width,
        minWidth: REPORT_SLIDE_THEME.slide.width,
        maxWidth: REPORT_SLIDE_THEME.slide.width,
        height: REPORT_SLIDE_THEME.slide.height,
        minHeight: REPORT_SLIDE_THEME.slide.height,
        maxHeight: REPORT_SLIDE_THEME.slide.height,
        fontFamily: 'var(--font-sans)',
        fontKerning: "normal",
        fontSynthesis: "none",
        textRendering: "geometricPrecision",
      }}
    >
      <div
        ref={frameRef}
        data-pdf-slide-frame={isExportMode ? "true" : undefined}
        className={shellClassName}
      style={{
        width: shellWidth,
        height: shellHeight,
        boxSizing: "border-box",
        margin: isExportMode ? 0 : "0 auto",
        borderRadius: isExportMode ? 0 : undefined,
        transform: undefined,
      }}
    >
        <div
          className={`relative flex h-full flex-col ${tone.shellBackground} ${REPORT_SLIDE_THEME.spacing.innerPadding} ${tone.body}`}
          style={{
            boxSizing: "border-box",
          }}
        >
          <div className={`pointer-events-none absolute inset-0 ${tone.overlay}`} />
          <div className={`pointer-events-none absolute inset-x-10 top-0 h-px ${tone.topLine}`} />
          {watermarkText ? (
            <div className="pointer-events-none absolute bottom-8 right-10 z-10 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-[11px] font-medium tracking-[0.04em] text-white/85 backdrop-blur">
              {watermarkText}
            </div>
          ) : null}
          {templateId === "modern" ? <ModernTemplateArtwork /> : null}
          <div
            className={`relative z-10 flex items-start ${
              hasHeaderCopy ? "justify-between gap-6" : "justify-end"
            }`}
          >
            {hasHeaderCopy ? (
              <div className="min-w-0">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.32em] ${tone.accent}`}>
                  {eyebrow}
                </p>
                <h2 className={`mt-3 text-[2.15rem] font-semibold tracking-[-0.04em] ${tone.title}`}>
                  {title}
                </h2>
              </div>
            ) : null}
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSlides }, (_, dotIndex) => dotIndex + 1).map((dot) => (
                  <span
                    key={dot}
                    className={`h-2.5 rounded-full ${
                      String(dot).padStart(2, "0") === index
                        ? `w-8 ${tone.activeDot}`
                        : `w-2.5 ${tone.inactiveDot}`
                    }`}
                  />
                ))}
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone.chip}`}>
                {index}/{String(totalSlides).padStart(2, "0")}
              </span>
            </div>
          </div>

          <div
            className={`relative z-10 min-h-0 flex-1 ${
              hasHeaderCopy
                ? REPORT_SLIDE_THEME.spacing.contentOffsetWithHeader
                : REPORT_SLIDE_THEME.spacing.contentOffsetWithoutHeader
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
