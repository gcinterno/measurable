import { ClosingSlide } from "@/components/reports/slides/ClosingSlide";
import { CoverSlide } from "@/components/reports/slides/CoverSlide";
import { GeneralInsightsReportSlide } from "@/components/reports/slides/GeneralInsightsReportSlide";
import { ImpressionsReportSlide } from "@/components/reports/slides/ImpressionsReportSlide";
import { ReachSlide } from "@/components/reports/slides/ReachSlide";
import type { ReportTemplate } from "@/lib/reports/templates";
import {
  buildClosingSlideModel,
  buildCoverSlideModel,
  buildGeneralInsightsSlideModel,
  buildImpressionsSlideModel,
  buildReachSlideModel,
  type DefaultTemplateContext,
} from "@/lib/reports/templates/default-view-models";

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
      key: "general-insights",
      layout: "kpi-grid",
      eyebrow: "",
      title: "",
      component: GeneralInsightsReportSlide,
      buildModel: buildGeneralInsightsSlideModel,
    },
    {
      id: "05",
      key: "closing",
      layout: "hero",
      eyebrow: "",
      title: "",
      component: ClosingSlide,
      buildModel: buildClosingSlideModel,
    },
  ],
};
