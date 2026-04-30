"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";

import { SlideRenderer } from "@/components/reports/SlideRenderer";
import type { ExecutiveDarkViewModel } from "@/components/reports/report-view.helpers";
import { REPORT_SLIDE_THEME } from "@/lib/reports/theme";

type ReportExportSurfaceProps = {
  model: ExecutiveDarkViewModel;
  branding?: {
    logoUrl?: string | null;
    source?: string;
  };
  onReadyChange?: (ready: boolean) => void;
};

const EXPORT_SLIDE_WIDTH = REPORT_SLIDE_THEME.slide.width;
const EXPORT_SLIDE_HEIGHT = REPORT_SLIDE_THEME.slide.height;

export const ReportExportSurface = forwardRef<HTMLDivElement, ReportExportSurfaceProps>(
  function ReportExportSurface(
    { model, branding, onReadyChange },
    ref
  ) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [fontsReady, setFontsReady] = useState(false);
    const [slidesReady, setSlidesReady] = useState(false);

    useEffect(() => {
      let active = true;

      async function waitForFonts() {
        try {
          await document.fonts.ready;
        } catch {
          // Ignore browser font readiness failures.
        }

        if (active) {
          setFontsReady(true);
        }
      }

      void waitForFonts();

      return () => {
        active = false;
      };
    }, []);

    useEffect(() => {
      let active = true;

      if (!fontsReady) {
        setSlidesReady(false);
        onReadyChange?.(false);
        return () => {
          active = false;
        };
      }

      const firstFrame = window.requestAnimationFrame(() => {
        const secondFrame = window.requestAnimationFrame(() => {
          const thirdFrame = window.requestAnimationFrame(() => {
            window.setTimeout(() => {
              if (!active) {
                return;
              }

              const root = rootRef.current;
              const slideCount =
                root?.querySelectorAll("[data-report-slide]").length || 0;
              const svgCount = root?.querySelectorAll("svg").length || 0;
              const logos = Array.from(
                root?.querySelectorAll<HTMLImageElement>('img[data-report-logo="true"]') ?? []
              );
              const logosReady = logos.every(
                (image) => image.complete && image.naturalWidth > 0
              );
              const firstSlide =
                root?.querySelector<HTMLElement>("[data-report-slide]");
              const firstSlideRect = firstSlide?.getBoundingClientRect();
              const slideWidthReady = firstSlideRect
                ? Math.abs(firstSlideRect.width - EXPORT_SLIDE_WIDTH) < 1
                : false;
              const slideHeightReady = firstSlideRect
                ? Math.abs(firstSlideRect.height - EXPORT_SLIDE_HEIGHT) < 1
                : false;
              const ready =
                slideCount === 5 &&
                svgCount > 0 &&
                logosReady &&
                slideWidthReady &&
                slideHeightReady;

              setSlidesReady(ready);
              onReadyChange?.(ready);
            }, 80);
          });

          return () => window.cancelAnimationFrame(thirdFrame);
        });

        return () => window.cancelAnimationFrame(secondFrame);
      });

      return () => {
        active = false;
        window.cancelAnimationFrame(firstFrame);
      };
    }, [fontsReady, branding?.logoUrl, model, onReadyChange]);

    const setRefs = useMemo(
      () => (node: HTMLDivElement | null) => {
        rootRef.current = node;

        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    return (
      <div
        ref={setRefs}
        aria-hidden="true"
        data-report-export-surface={slidesReady ? "ready" : "loading"}
        style={{
          position: "fixed",
          left: "-100000px",
          top: 0,
          width: `${EXPORT_SLIDE_WIDTH}px`,
          minWidth: `${EXPORT_SLIDE_WIDTH}px`,
          maxWidth: `${EXPORT_SLIDE_WIDTH}px`,
          opacity: 1,
          pointerEvents: "none",
          zIndex: -1,
          overflow: "hidden",
          background: "#07111f",
        }}
      >
        <SlideRenderer
          model={model}
          renderMode="export"
          branding={branding}
        />
      </div>
    );
  }
);
