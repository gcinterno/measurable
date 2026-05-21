"use client";

import { SlideCanvas } from "@/components/reports/SlideCanvas";
import { FooterMeta } from "@/components/reports/primitives/FooterMeta";
import { HeroBlock } from "@/components/reports/primitives/HeroBlock";
import { CoverLogo } from "@/components/reports/slides/shared";
import { isLightTemplate } from "@/components/reports/slides/template";
import type { ClosingSlideModel, SlideComponentProps } from "@/components/reports/slides/types";

/*
 * LEGACY / candidate for removal after contract is stable.
 * Official 5-slide closing summary uses SummarySlide via lib/reports/templates/default.ts.
 * Keep this component only for legacy flows that still expect the old closing payload shape.
 */
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
