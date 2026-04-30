import type { ComponentType } from "react";

import type { BaseSlideFrameProps } from "@/components/reports/slides/types";
import type { DefaultTemplateContext } from "@/lib/reports/templates/default-view-models";
import { DEFAULT_REPORT_TEMPLATE } from "@/lib/reports/templates/default";

export type SlideDefinition<TContext = unknown, TModel = unknown> = {
  id: string;
  key: string;
  layout: string;
  eyebrow: string;
  title: string;
  component: ComponentType<BaseSlideFrameProps & { model: TModel }>;
  buildModel: (context: TContext) => TModel;
};

export type ReportTemplate<TContext = unknown> = {
  id: string;
  theme: string;
  slides: SlideDefinition<TContext, unknown>[];
};

export function getReportTemplate(
  templateId = "default"
): ReportTemplate<DefaultTemplateContext> {
  if (templateId === "default") {
    return DEFAULT_REPORT_TEMPLATE;
  }

  return DEFAULT_REPORT_TEMPLATE;
}
