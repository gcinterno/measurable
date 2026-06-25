import { CoverSlide } from "@/components/reports/slides/CoverSlide";
import { ReachSlide } from "@/components/reports/slides/ReachSlide";
import { SummarySlide } from "@/components/reports/slides/SummarySlide";
import type { ReportTemplate } from "@/lib/reports/templates";
import {
  buildCoverSlideModel,
  buildFourthMetricSlideModel,
  buildReachSlideModel,
  buildSummarySlideModel,
  buildThirdMetricSlideModel,
  type DefaultTemplateContext,
} from "@/lib/reports/templates/default-view-models";

/*
 * Source of truth for the official 5-slide report structure:
 * 1. Cover
 * 2. Reach
 * 3. Impressions or Engagement
 * 4. Engagement or Page Views
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
      key: "metric_three",
      layout: "metric",
      eyebrow: "",
      title: "",
      component: ReachSlide,
      buildModel: buildThirdMetricSlideModel,
    },
    {
      id: "04",
      key: "metric_four",
      layout: "metric",
      eyebrow: "",
      title: "",
      component: ReachSlide,
      buildModel: buildFourthMetricSlideModel,
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
