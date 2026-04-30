"use client";

import type { ExecutiveDarkSeriesPoint } from "@/components/reports/report-view.helpers";
import type { ReportRenderMode } from "@/lib/reports/theme";

export type BaseSlideFrameProps = {
  slideId: string;
  eyebrow: string;
  title: string;
  renderMode: ReportRenderMode;
};

export type SlideComponentProps<TModel> = BaseSlideFrameProps & {
  model: TModel;
};

export type CoverSlideModel = {
  reportTitle: string;
  subtitle: string;
  meta: string;
  branding: {
    logoUrl: string | null;
  };
};

export type ReachSlideCardModel = {
  label: string;
  value: string;
  meta: string;
};

export type ReachSlideModel = {
  metricEyebrow: string;
  metricTitle: string;
  sourceCaption: string;
  totalLabel: string;
  totalValue: string;
  insightText: string;
  chartPoints: ExecutiveDarkSeriesPoint[];
  chartAvailable: boolean;
  chartMetricLabel: string;
  highestDayCard: ReachSlideCardModel;
  lowestDayCard: ReachSlideCardModel;
};

export type ImpressionsSlideModel = {
  impressions_total: number;
  impressions_daily: {
    date: string;
    value: number;
  }[];
  reach_total: number;
  timeframe_since?: string;
  timeframe_until?: string;
  metric_label?: string;
  average_daily?: number;
  highest_day?: { date: string; value: number } | null;
  lowest_day?: { date: string; value: number } | null;
  frequency?: number;
  insight_text?: string;
  impressions_daily_count?: number;
  title?: string;
  impressions_slide_present?: boolean;
  unavailable?: boolean;
  source_metric_name?: string;
  timeframe_source?: string;
};

export type GeneralInsightsMetricState = {
  value: string | number;
  available: boolean;
  semantic_valid: boolean;
  source_metric_name?: string;
};

export type GeneralInsightsSlideModel = {
  reach_total: number;
  impressions_total: number;
  frequency: number;
  followers_total: number;
  followers_growth: number;
  interactions_total: number;
  link_clicks: number;
  page_visits: number;
  reach_label?: string;
  impressions_label?: string;
  general_insights_slide_present?: boolean;
  raw_general_insights?: Record<string, unknown> | null;
  metrics?: {
    reach?: GeneralInsightsMetricState | null;
    impressions?: GeneralInsightsMetricState | null;
    frequency?: GeneralInsightsMetricState | null;
    followers?: GeneralInsightsMetricState | null;
    followers_growth?: GeneralInsightsMetricState | null;
    interactions?: GeneralInsightsMetricState | null;
    link_clicks?: GeneralInsightsMetricState | null;
    page_visits?: GeneralInsightsMetricState | null;
  };
};

export type ClosingSlideModel = {
  eyebrow: string;
  title: string;
  subtitle: string;
  meta: string;
  footerText: string;
  branding: {
    logoUrl: string | null;
  };
};
