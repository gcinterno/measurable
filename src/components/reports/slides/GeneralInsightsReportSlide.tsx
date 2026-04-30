"use client";

import { GeneralInsightsSlide } from "@/components/reports/GeneralInsightsSlide";
import { SlideCanvas } from "@/components/reports/SlideCanvas";
import type {
  GeneralInsightsSlideModel,
  SlideComponentProps,
} from "@/components/reports/slides/types";

export function GeneralInsightsReportSlide({
  slideId,
  eyebrow,
  title,
  renderMode,
  model,
}: SlideComponentProps<GeneralInsightsSlideModel>) {
  return (
    <SlideCanvas
      index={slideId}
      eyebrow={eyebrow}
      title={title}
      renderMode={renderMode}
    >
      <GeneralInsightsSlide {...model} />
    </SlideCanvas>
  );
}
