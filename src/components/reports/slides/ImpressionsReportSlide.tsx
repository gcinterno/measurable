"use client";

import { ImpressionsSlide } from "@/components/reports/ImpressionsSlide";
import { SlideCanvas } from "@/components/reports/SlideCanvas";
import type { ImpressionsSlideModel, SlideComponentProps } from "@/components/reports/slides/types";

export function ImpressionsReportSlide({
  slideId,
  eyebrow,
  title,
  renderMode,
  model,
}: SlideComponentProps<ImpressionsSlideModel>) {
  return (
    <SlideCanvas
      index={slideId}
      eyebrow={eyebrow}
      title={title}
      renderMode={renderMode}
    >
      <ImpressionsSlide {...model} />
    </SlideCanvas>
  );
}
