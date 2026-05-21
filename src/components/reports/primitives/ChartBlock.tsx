"use client";

import type { ReactNode } from "react";

type ChartBlockProps = {
  children: ReactNode;
  className?: string;
};

export function ChartBlock({
  children,
  className = "grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4",
}: ChartBlockProps) {
  return <div className={className}>{children}</div>;
}
