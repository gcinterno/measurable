"use client";

import type { ReactNode } from "react";

type ReportSlideCanvasProps = {
  children: ReactNode;
  className?: string;
};

type ReportSlideHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  progress?: ReactNode;
  className?: string;
};

type ReportSlideBodyProps = {
  children: ReactNode;
  className?: string;
};

type ReportSlideProgressSlotProps = {
  children: ReactNode;
  className?: string;
};

function joinClasses(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

// Report slides are presentation canvases, not responsive dashboards.
// Semantic slide layouts must fit within the fixed slide surface.
// Contract:
// - canvas owns a fixed presentation-safe padding
// - semantic content fills the available slide surface with w-full and h-full
// - header consumes ~20% of the slide surface
// - body consumes the remaining space, stays min-h-0, and clips overflow at the canvas boundary
export function ReportSlideCanvas({
  children,
  className,
}: ReportSlideCanvasProps) {
  return (
    <div
      className={joinClasses(
        "relative flex h-full w-full flex-col overflow-hidden px-8 py-8",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ReportSlideHeader({
  title,
  subtitle,
  progress,
  className,
}: ReportSlideHeaderProps) {
  return (
    <header
      className={joinClasses(
        "flex h-[20%] min-h-0 w-full shrink-0 items-start justify-between gap-6 overflow-hidden",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h2 className="truncate">{title}</h2>
        {subtitle ? <div className="mt-2">{subtitle}</div> : null}
      </div>
      {progress ? <ReportSlideProgressSlot>{progress}</ReportSlideProgressSlot> : null}
    </header>
  );
}

export function ReportSlideBody({
  children,
  className,
}: ReportSlideBodyProps) {
  return (
    <div
      className={joinClasses(
        "min-h-0 h-[80%] w-full flex-1 overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ReportSlideProgressSlot({
  children,
  className,
}: ReportSlideProgressSlotProps) {
  return (
    <div className={joinClasses("shrink-0 self-start", className)}>
      {children}
    </div>
  );
}
