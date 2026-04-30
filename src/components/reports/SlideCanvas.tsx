"use client";

import type { ReactNode } from "react";

import {
  REPORT_SLIDE_THEME,
  type ReportRenderMode,
} from "@/lib/reports/theme";

type SlideCanvasProps = {
  index: string;
  totalSlides?: number;
  title: string;
  eyebrow: string;
  children: ReactNode;
  renderMode?: ReportRenderMode;
};

export function SlideCanvas({
  index,
  totalSlides = 5,
  title,
  eyebrow,
  children,
  renderMode = "preview",
}: SlideCanvasProps) {
  const hasHeaderCopy = Boolean(eyebrow || title);
  const isExportMode = renderMode === "export";
  const slideClassName = isExportMode ? "report-pdf-slide" : "report-preview-slide";
  const frameClassName = isExportMode
    ? slideClassName
    : `${slideClassName} ${REPORT_SLIDE_THEME.radius.outerFrame} border ${REPORT_SLIDE_THEME.colors.frameBorder} ${REPORT_SLIDE_THEME.colors.frameBackground} ${REPORT_SLIDE_THEME.spacing.outerPadding} ${REPORT_SLIDE_THEME.effects.outerShadow}`;
  const shellClassName = isExportMode
    ? `overflow-hidden bg-[#07111f]`
    : `mx-auto max-w-none overflow-hidden border ${REPORT_SLIDE_THEME.colors.shellBorder} ${REPORT_SLIDE_THEME.radius.innerFrame} bg-[#07111f] ${REPORT_SLIDE_THEME.effects.innerShadow}`;
  const shellWidth = isExportMode
    ? REPORT_SLIDE_THEME.slide.width
    : REPORT_SLIDE_THEME.slide.surfaceWidth;
  const shellHeight = isExportMode
    ? REPORT_SLIDE_THEME.slide.height
    : REPORT_SLIDE_THEME.slide.surfaceHeight;

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
      data-report-slide={index}
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
        className={shellClassName}
        style={{
          width: shellWidth,
          height: shellHeight,
          boxSizing: "border-box",
          margin: isExportMode ? 0 : "0 auto",
          borderRadius: isExportMode ? 0 : undefined,
        }}
      >
        <div
          className={`relative flex h-full flex-col ${REPORT_SLIDE_THEME.colors.shellBackground} ${REPORT_SLIDE_THEME.spacing.innerPadding} ${REPORT_SLIDE_THEME.colors.textPrimary}`}
          style={{
            boxSizing: "border-box",
          }}
        >
          <div
            className={`pointer-events-none absolute inset-0 ${REPORT_SLIDE_THEME.effects.shellOverlay}`}
          />
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <div
            className={`flex items-start ${
              hasHeaderCopy ? "justify-between gap-6" : "justify-end"
            }`}
          >
            {hasHeaderCopy ? (
              <div className="min-w-0">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.32em] ${REPORT_SLIDE_THEME.colors.accent}`}>
                  {eyebrow}
                </p>
                <h2 className="mt-3 text-[2.15rem] font-semibold tracking-[-0.04em] text-white">
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
                        ? "w-8 bg-white"
                        : "w-2.5 bg-white/25"
                    }`}
                  />
                ))}
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                {index}/{String(totalSlides).padStart(2, "0")}
              </span>
            </div>
          </div>

          <div
            className={`relative min-h-0 flex-1 ${
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
