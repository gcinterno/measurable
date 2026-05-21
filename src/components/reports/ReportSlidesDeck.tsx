"use client";

import { SlideRenderer } from "@/components/reports/SlideRenderer";
import {
  buildExecutiveDarkViewModel,
  type ExecutiveDarkTimeframe,
} from "@/components/reports/report-view.helpers";
import type { ReportVersionBlock } from "@/types/report";

type ReportSlidesDeckProps = {
  blocks: ReportVersionBlock[];
  theme?: string;
  descriptionTimeframe?: {
    label?: string;
    since?: string;
    until?: string;
    key?: string;
    preset?: string;
  } | null;
  branding?: {
    logoUrl?: string | null;
    brandName?: string | null;
  } | null;
};

/*
 * LEGACY / candidate for removal after contract is stable.
 * Source of truth for 5-slide rendering is:
 * - renderer: SlideRenderer.tsx
 * - order/structure: lib/reports/templates/default.ts
 * - branding: lib/reports/branding.ts
 * - daily series: lib/reports/daily-series.ts
 *
 * This component is intentionally kept as a compatibility shim and now delegates
 * to the official SlideRenderer instead of maintaining a parallel rendering path.
 */
export function ReportSlidesDeck({
  blocks,
  descriptionTimeframe,
  branding,
}: ReportSlidesDeckProps) {
  const model = buildExecutiveDarkViewModel(blocks, {
    descriptionTimeframe: descriptionTimeframe as ExecutiveDarkTimeframe | null | undefined,
  });

  return (
    <SlideRenderer
      model={model}
      blocks={blocks}
      branding={branding}
      templateId="executive"
    />
  );
}

