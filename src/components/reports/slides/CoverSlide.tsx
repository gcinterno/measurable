"use client";

import { SlideCanvas } from "@/components/reports/SlideCanvas";
import { HeroBlock } from "@/components/reports/primitives/HeroBlock";
import { CoverLogo } from "@/components/reports/slides/shared";
import type { CoverSlideModel, SlideComponentProps } from "@/components/reports/slides/types";

export function CoverSlide({
  slideId,
  eyebrow,
  title,
  renderMode,
  model,
}: SlideComponentProps<CoverSlideModel>) {
  return (
    <SlideCanvas
      index={slideId}
      eyebrow={eyebrow}
      title={title}
      renderMode={renderMode}
    >
      <HeroBlock
        title={model.reportTitle}
        subtitle={model.subtitle}
        meta={model.meta}
        rightSlot={<CoverLogo logoDataUrl={model.branding.logoUrl} dark />}
      />
    </SlideCanvas>
  );
}
