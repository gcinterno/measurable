"use client";

import type { ReactNode } from "react";

type ChartBlockProps = {
  children: ReactNode;
  className?: string;
};

export function ChartBlock({
  children,
  className = "grid min-h-0 grid-rows-[360px_1fr] gap-4",
}: ChartBlockProps) {
  return <div className={className}>{children}</div>;
}
