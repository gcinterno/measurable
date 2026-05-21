import { CoverSlide } from "@/components/reports/slides/CoverSlide";
import { ImpressionsReportSlide } from "@/components/reports/slides/ImpressionsReportSlide";
import { ReachSlide } from "@/components/reports/slides/ReachSlide";
import { SummarySlide } from "@/components/reports/slides/SummarySlide";
import type { ReportTemplate } from "@/lib/reports/templates";
import {
  buildCoverSlideModel,
  buildEngagementSlideModel,
  buildImpressionsSlideModel,
  buildReachSlideModel,
  buildSummarySlideModel,
  type DefaultTemplateContext,
} from "@/lib/reports/templates/default-view-models";

/*
 * Source of truth for the official 5-slide report structure:
 * 1. Cover
 * 2. Reach
 * 3. Impressions
 * 4. Engagement
 * 5. Summary
 */
export const DEFAULT_REPORT_TEMPLATE: ReportTemplate<DefaultTemplateContext> = {
  id: "default",
  theme: "minimal-dark",
  slides: [
    {
      id: "01",
      key: "cover",
      layout: "hero",
      eyebrow: "",
      title: "",
      component: CoverSlide,
      buildModel: buildCoverSlideModel,
    },
    {
      id: "02",
      key: "reach",
      layout: "metric",
      eyebrow: "",
      title: "",
      component: ReachSlide,
      buildModel: buildReachSlideModel,
    },
    {
      id: "03",
      key: "impressions",
      layout: "metric",
      eyebrow: "",
      title: "",
      component: ImpressionsReportSlide,
      buildModel: buildImpressionsSlideModel,
    },
    {
      id: "04",
      key: "engagement",
      layout: "metric",
      eyebrow: "",
      title: "",
      component: ReachSlide,
      buildModel: buildEngagementSlideModel,
    },
    {
      id: "05",
      key: "summary",
      layout: "summary",
      eyebrow: "",
      title: "",
      component: SummarySlide,
      buildModel: buildSummarySlideModel,
    },
  ],
};
