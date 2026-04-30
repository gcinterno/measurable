"use client";

import { SlideCanvas } from "@/components/reports/SlideCanvas";
import { FooterMeta } from "@/components/reports/primitives/FooterMeta";
import { HeroBlock } from "@/components/reports/primitives/HeroBlock";
import { CoverLogo } from "@/components/reports/slides/shared";
import type { ClosingSlideModel, SlideComponentProps } from "@/components/reports/slides/types";

export function ClosingSlide({
  slideId,
  eyebrow,
  title,
  renderMode,
  model,
}: SlideComponentProps<ClosingSlideModel>) {
  return (
    <SlideCanvas
      index={slideId}
      eyebrow={eyebrow}
      title={title}
      renderMode={renderMode}
    >
      <HeroBlock
        eyebrow={model.eyebrow}
        title={model.title}
        subtitle={model.subtitle}
        meta={model.meta}
        footer={<FooterMeta text={model.footerText} />}
        rightSlot={<CoverLogo logoDataUrl={model.branding.logoUrl} dark />}
      />
    </SlideCanvas>
  );
}
