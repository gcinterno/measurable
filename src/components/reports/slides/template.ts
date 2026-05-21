"use client";

import type { ReportTemplateId } from "@/lib/reports/template-selection";

export function isModernTemplate(templateId: ReportTemplateId) {
  return templateId === "modern";
}

export function isSimpleTemplate(templateId: ReportTemplateId) {
  return templateId === "simple";
}

export function isLightTemplate(templateId: ReportTemplateId) {
  return isModernTemplate(templateId) || isSimpleTemplate(templateId);
}

export function getTemplateTone(templateId: ReportTemplateId) {
  const modern = isModernTemplate(templateId);
  const simple = isSimpleTemplate(templateId);

  return {
    dark: !isLightTemplate(templateId),
    shellBackground: modern
      ? "bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.045),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.04),transparent_24%),linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)]"
      : simple
        ? "bg-[radial-gradient(circle_at_top_right,rgba(21,112,184,0.06),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(92,90,142,0.06),transparent_24%),linear-gradient(180deg,#f1f4f8_0%,#eef2f6_100%)]"
        : "bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.14),transparent_22%),linear-gradient(180deg,#07111f_0%,#0b1728_100%)]",
    shellBase: modern ? "bg-white" : simple ? "bg-[#EEF2F6]" : "bg-[#07111f]",
    body: modern ? "text-slate-950" : simple ? "text-[#08122F]" : "text-white",
    title: modern ? "text-slate-950" : simple ? "text-[#08122F]" : "text-white",
    subtitle: modern ? "text-slate-600" : simple ? "text-[#6B7C97]" : "text-slate-300",
    subtle: modern ? "text-slate-500" : simple ? "text-[#6B7C97]" : "text-slate-400",
    accent: modern ? "text-sky-700" : simple ? "text-[#1570B8]" : "text-sky-300",
    accentSoft: modern ? "text-sky-600" : simple ? "text-[#4E607A]" : "text-sky-200",
    card: modern
      ? "border-slate-200/90 bg-white/95 shadow-[0_18px_40px_rgba(37,99,235,0.10)]"
      : simple
        ? "border-[#DCE3EC] bg-white/80"
        : "border-white/10 bg-white/[0.04]",
    cardStrong: modern
      ? "border-transparent bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_38%,#3b82f6_100%)] shadow-[0_22px_48px_rgba(37,99,235,0.24)]"
      : simple
        ? "border-[#DCE3EC] bg-[#CFE1FA]"
        : "border-white/10 bg-white/[0.06]",
    insight: modern
      ? "border-transparent bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_45%,#3b82f6_100%)] shadow-[0_24px_56px_rgba(37,99,235,0.22)]"
      : simple
        ? "border-[#DCE3EC] bg-[#625C94]"
        : "border-sky-300/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(255,255,255,0.045))]",
    chip: modern
      ? "border-slate-200 bg-slate-100 text-slate-600"
      : simple
        ? "border-[#DCE3EC] bg-[#EDF1F5] text-[#4E607A]"
        : "border-white/10 bg-white/5 text-slate-300",
    cardStrongTitle: modern ? "text-white" : simple ? "text-[#08122F]" : "text-white",
    cardStrongSubtitle: modern ? "text-sky-100/90" : simple ? "text-[#08122F]" : "text-slate-300",
    cardStrongAccent: modern ? "text-white/75" : simple ? "text-[#1570B8]" : "text-sky-300",
    insightTitle: modern ? "text-white/80" : simple ? "text-white/90" : "text-sky-200",
    insightBody: modern ? "text-white" : simple ? "text-white" : "text-slate-300",
    listItem: modern
      ? "border-sky-100/80 bg-sky-50/80 text-slate-700"
      : simple
        ? "border-[#DCE3EC] bg-white/75 text-[#4E607A]"
        : "border-white/10 bg-white/[0.04] text-slate-300",
    waveStroke: modern ? "stroke-[rgba(15,23,42,0.10)]" : simple ? "stroke-[rgba(107,124,151,0.18)]" : "stroke-white/10",
    activeDot: modern ? "bg-slate-950" : simple ? "bg-[#08122F]" : "bg-white",
    inactiveDot: modern ? "bg-slate-300" : simple ? "bg-[#C9D3E1]" : "bg-white/25",
    divider: modern
      ? "bg-gradient-to-r from-sky-500 via-slate-300 to-transparent"
      : simple
        ? "bg-gradient-to-r from-[#1570B8] via-[#DCE3EC] to-transparent"
        : "bg-gradient-to-r from-sky-300 via-white/70 to-transparent",
    overlay: modern
      ? "bg-[linear-gradient(135deg,rgba(255,255,255,0.76),transparent_30%,transparent_76%,rgba(14,165,233,0.03))]"
      : simple
        ? "bg-[linear-gradient(135deg,rgba(255,255,255,0.32),transparent_30%,transparent_78%,rgba(21,112,184,0.02))]"
        : "bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_26%,transparent_74%,rgba(255,255,255,0.03))]",
    topLine: modern
      ? "bg-gradient-to-r from-transparent via-slate-300 to-transparent"
      : simple
        ? "bg-gradient-to-r from-transparent via-[#DCE3EC] to-transparent"
        : "bg-gradient-to-r from-transparent via-white/25 to-transparent",
  };
}
