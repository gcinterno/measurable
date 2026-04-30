"use client";

import { cloneElement, useEffect, useMemo, useRef, useState, type ReactElement } from "react";

import { REPORT_SLIDE_THEME } from "@/lib/reports/theme";

type SlideDeckViewportProps = {
  children: React.ReactNode;
  slides: ReactElement[];
};

export function SlideDeckViewport({ children, slides }: SlideDeckViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const lightboxSlideRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(null);
  const [lightboxScale, setLightboxScale] = useState(1);

  const fixedWidth = REPORT_SLIDE_THEME.slide.width;
  const fixedHeight = REPORT_SLIDE_THEME.slide.height;

  const updateLayout = useMemo(
    () => () => {
      const container = containerRef.current;
      const content = contentRef.current;

      if (!container || !content) {
        return;
      }

      const containerWidth = container.clientWidth;
      const nextScale = Math.min(1, containerWidth / fixedWidth);
      const nextHeight = content.scrollHeight * nextScale;

      console.log("[SLIDE_SCALE_DEBUG]", {
        containerWidth,
        baseWidth: fixedWidth,
        scale: nextScale,
        viewport: typeof window === "undefined" ? 0 : window.innerWidth,
      });

      setScale(nextScale);
      setScaledHeight(nextHeight);
    },
    [fixedWidth]
  );

  const updateLightboxScale = useMemo(
    () => () => {
      const slide = lightboxSlideRef.current;

      if (!slide) {
        return;
      }

      const availableWidth = window.innerWidth - 24;
      const availableHeight = window.innerHeight - 140;
      const nextScale = Math.min(
        1,
        availableWidth / fixedWidth,
        availableHeight / fixedHeight
      );

      setLightboxScale(nextScale);
    },
    [fixedHeight, fixedWidth]
  );

  useEffect(() => {
    updateLayout();

    const container = containerRef.current;

    if (!container) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateLayout();
    });

    resizeObserver.observe(container);
    window.addEventListener("resize", updateLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, [updateLayout]);

  useEffect(() => {
    updateLayout();
  }, [children, updateLayout]);

  useEffect(() => {
    if (activeSlideIndex === null) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      updateLightboxScale();
    });
    window.addEventListener("resize", updateLightboxScale);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateLightboxScale);
    };
  }, [activeSlideIndex, updateLightboxScale]);

  useEffect(() => {
    if (activeSlideIndex === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveSlideIndex(null);
      }

      if (event.key === "ArrowRight") {
        setActiveSlideIndex((current) =>
          current === null ? current : Math.min(slides.length - 1, current + 1)
        );
      }

      if (event.key === "ArrowLeft") {
        setActiveSlideIndex((current) =>
          current === null ? current : Math.max(0, current - 1)
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeSlideIndex, slides.length]);

  const activeSlide =
    activeSlideIndex === null ? null : slides[activeSlideIndex] || null;

  return (
    <>
      <div ref={containerRef} className="w-full overflow-visible">
        <div
          className="relative"
          style={{ height: scaledHeight || undefined }}
        >
          <div
            ref={contentRef}
            className="absolute left-1/2 top-0"
            style={{
              width: fixedWidth,
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: "top center",
            }}
            onClick={(event) => {
              if (typeof window !== "undefined" && window.innerWidth >= 768) {
                return;
              }

              const slideElement = (event.target as HTMLElement).closest("[data-report-slide]");

              if (!slideElement) {
                return;
              }

              const slideId = slideElement.getAttribute("data-report-slide");
              const nextIndex = slides.findIndex(
                (_, index) => String(index + 1).padStart(2, "0") === slideId
              );

              if (nextIndex >= 0) {
                setActiveSlideIndex(nextIndex);
              }
            }}
          >
            {children}
          </div>
        </div>
      </div>

      {activeSlide ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/96 px-3 pb-6 pt-4 backdrop-blur md:hidden"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveSlideIndex(null)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
                <path d="M7 7l10 10M17 7L7 17" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <span className="text-sm font-medium text-white/75">
              {activeSlideIndex + 1} / {slides.length}
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div ref={lightboxSlideRef} className="flex items-center justify-center">
              <div
                style={{
                  width: fixedWidth,
                  transform: `scale(${lightboxScale})`,
                  transformOrigin: "center center",
                }}
              >
                {cloneElement(activeSlide, {
                  key: `lightbox-${activeSlideIndex}`,
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                setActiveSlideIndex((current) =>
                  current === null ? current : Math.max(0, current - 1)
                )
              }
              disabled={activeSlideIndex === 0}
              className="inline-flex min-w-[7rem] items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white disabled:opacity-35"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveSlideIndex((current) =>
                  current === null ? current : Math.min(slides.length - 1, current + 1)
                )
              }
              disabled={activeSlideIndex === slides.length - 1}
              className="inline-flex min-w-[7rem] items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-35"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
