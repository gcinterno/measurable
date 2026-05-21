"use client";

import { SlideCanvas } from "@/components/reports/SlideCanvas";
import { FooterMeta } from "@/components/reports/primitives/FooterMeta";
import { HeroBlock } from "@/components/reports/primitives/HeroBlock";
import { CoverLogo } from "@/components/reports/slides/shared";
import { isLightTemplate } from "@/components/reports/slides/template";
import type { ClosingSlideModel, SlideComponentProps } from "@/components/reports/slides/types";

export function ClosingSlide({
  slideId,
  eyebrow,
  title,
  renderMode,
  templateId,
  model,
}: SlideComponentProps<ClosingSlideModel>) {
  return (
    <SlideCanvas
      index={slideId}
      eyebrow={eyebrow}
      title={title}
      renderMode={renderMode}
      templateId={templateId}
    >
      <HeroBlock
        eyebrow={model.eyebrow}
        title={model.title}
        subtitle={model.subtitle}
        meta={model.meta}
        footer={<FooterMeta text={model.footerText} />}
        templateId={templateId}
        rightSlot={<CoverLogo logoDataUrl={model.branding.logoUrl} dark={!isLightTemplate(templateId)} />}
      />
    </SlideCanvas>
  );
}
