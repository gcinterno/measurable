import { CoverSlide } from "@/components/reports/slides/CoverSlide";
import { ReachSlide } from "@/components/reports/slides/ReachSlide";
import { SummarySlide } from "@/components/reports/slides/SummarySlide";
import type { ReportTemplate } from "@/lib/reports/templates";
import {
  buildCoverSlideModel,
  buildEngagementSlideModel,
  buildPageViewsSlideModel,
  buildReachSlideModel,
  buildSummarySlideModel,
  type DefaultTemplateContext,
} from "@/lib/reports/templates/default-view-models";

/*
 * Source of truth for the official 5-slide report structure:
 * 1. Cover
 * 2. Reach
 * 3. Engagement
 * 4. Page Views
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
      key: "engagement",
      layout: "metric",
      eyebrow: "",
      title: "",
      component: ReachSlide,
      buildModel: buildEngagementSlideModel,
    },
    {
      id: "04",
      key: "page_views",
      layout: "metric",
      eyebrow: "",
      title: "",
      component: ReachSlide,
      buildModel: buildPageViewsSlideModel,
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
