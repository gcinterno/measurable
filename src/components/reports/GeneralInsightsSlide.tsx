"use client";

import { useEffect } from "react";

import { InsightBox } from "@/components/reports/primitives/InsightBox";
import { KPICard, KPIGrid } from "@/components/reports/primitives/KPIGrid";
import { formatDisplayNumber } from "@/lib/formatters";

type MetricState = {
  value: string | number;
  available: boolean;
  semantic_valid: boolean;
  source_metric_name?: string;
};

type GeneralInsightsSlideProps = {
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
    reach?: MetricState | null;
    impressions?: MetricState | null;
    frequency?: MetricState | null;
    followers?: MetricState | null;
    followers_growth?: MetricState | null;
    interactions?: MetricState | null;
    link_clicks?: MetricState | null;
    page_visits?: MetricState | null;
  };
};

type InsightCard = {
  label: string;
  value: string;
  meta: string;
  trend?: "up" | "down";
  unavailable?: boolean;
};

function getMetricNumber(metric?: MetricState | null) {
  if (!resolveMetricAvailability(metric)) {
    return null;
  }

  const parsed = Number(metric?.value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildInsight(props: GeneralInsightsSlideProps) {
  const reachLabel = props.reach_label || "Espectadores";
  const impressionsLabel = props.impressions_label || "Visualizaciones";
  const reach = getMetricNumber(props.metrics?.reach);
  const impressions = getMetricNumber(props.metrics?.impressions);
  const frequency = getMetricNumber(props.metrics?.frequency);
  const followers = getMetricNumber(props.metrics?.followers);
  const followersGrowth = getMetricNumber(props.metrics?.followers_growth);
  const interactions = getMetricNumber(props.metrics?.interactions);
  const linkClicks = getMetricNumber(props.metrics?.link_clicks);
  const pageVisits = getMetricNumber(props.metrics?.page_visits);
  const parts: string[] = [];

  if (followersGrowth !== null) {
    parts.push(
      followersGrowth > 0
        ? "El crecimiento de seguidores se mantuvo positivo."
        : followersGrowth < 0
          ? "El crecimiento de seguidores cerró en terreno negativo."
          : "El crecimiento de seguidores se mantuvo plano."
    );
  } else if (followers !== null) {
    parts.push(
      `La base de seguidores cerró en ${formatDisplayNumber(followers)} para el periodo analizado.`
    );
  }

  if (reach !== null && impressions !== null) {
    const inflationRead =
      impressions > reach * 2.5
        ? `${impressionsLabel} está creciendo más rápido que ${reachLabel.toLowerCase()}, así que parte del volumen parece venir de repetición y no solo de expansión de audiencia.`
        : `${impressionsLabel} y ${reachLabel.toLowerCase()} siguen razonablemente equilibrados, lo que sugiere que la visibilidad no depende solo de repetición.`;
    parts.push(
      `${reachLabel} entregó ${formatDisplayNumber(reach)} y ${impressionsLabel.toLowerCase()} llegó a ${formatDisplayNumber(impressions)}. ${inflationRead}`
    );
  } else if (reach !== null) {
    parts.push(
      `${reachLabel} entregó ${formatDisplayNumber(reach)} durante el periodo analizado.`
    );
  } else if (impressions !== null) {
    parts.push(
      `${impressionsLabel} alcanzó ${formatDisplayNumber(impressions)} en el periodo analizado.`
    );
  }

  if (frequency !== null) {
    const frequencyRead =
      frequency >= 3
        ? "La frecuencia ya sugiere presión por repetición y posible fatiga en parte de la audiencia."
        : frequency >= 1.8
          ? "La frecuencia se mantiene en una zona saludable de refuerzo, con repetición útil sin una saturación evidente."
          : "La frecuencia sigue moderada, lo que mantiene controlada la repetición y hace más eficiente el alcance.";
    parts.push(
      `La frecuencia cerró en ${frequency.toFixed(2)}x. ${frequencyRead}`
    );
  }

  if (interactions !== null && linkClicks !== null && pageVisits !== null) {
    const qualityRead =
      interactions > linkClicks
        ? "Las señales de interacción son amplias, lo que sugiere que el contenido está generando algo más que clics."
        : "La respuesta se apoya más en acciones de tráfico, así que conviene vigilar la resonancia del contenido más allá de los clics.";
    parts.push(
      `Las interacciones totalizaron ${formatDisplayNumber(interactions)}, apoyadas por ${formatDisplayNumber(linkClicks)} clics en enlace y ${formatDisplayNumber(pageVisits)} visitas a la página. ${qualityRead}`
    );
  } else if (interactions !== null) {
    parts.push(
      `Las interacciones totalizaron ${formatDisplayNumber(interactions)} en el periodo.`
    );
  } else if (pageVisits !== null) {
    parts.push(
      `Las visitas a la página sumaron ${formatDisplayNumber(pageVisits)} durante el periodo.`
    );
  }

  if (parts.length <= 1) {
    return "Este resumen se generó con las métricas disponibles actualmente en la fuente de Facebook Insights. Algunas métricas no estuvieron disponibles con suficiente precisión para este periodo.";
  }

  return parts.join(" ");
}

function getTrend(value: number): "up" | "down" | undefined {
  if (value > 0) {
    return "up";
  }

  if (value < 0) {
    return "down";
  }

  return undefined;
}

function resolveMetricAvailability(metric?: MetricState | null) {
  return Boolean(
    metric &&
      metric.available !== false &&
      metric.semantic_valid !== false &&
      metric.value !== null &&
      metric.value !== undefined &&
      String(metric.value).trim() !== ""
  );
}

function getMetricCard(
  label: string,
  fallbackValue: string,
  fallbackMeta: string,
  metric?: MetricState | null,
  trend?: "up" | "down",
  useFallbackWhenMissing = true
) {
  if (!metric) {
    if (!useFallbackWhenMissing) {
      return {
        label,
        value: "N/D",
        meta: "No disponible con la fuente actual",
        unavailable: true,
      } satisfies InsightCard;
    }

    return {
      label,
      value: fallbackValue,
      meta: fallbackMeta,
      trend,
    } satisfies InsightCard;
  }

  if (!resolveMetricAvailability(metric)) {
    return {
      label,
      value: "N/D",
      meta: "No disponible con la fuente actual",
      unavailable: true,
    } satisfies InsightCard;
  }

  const rawValue = metric.value;
  const formattedValue =
    typeof rawValue === "number"
      ? formatDisplayNumber(rawValue)
      : label === "Frequency"
        ? `${Number(rawValue).toFixed(2)}x`
        : formatDisplayNumber(rawValue);

  return {
    label,
    value: formattedValue,
    meta: fallbackMeta,
    trend,
  } satisfies InsightCard;
}

export function GeneralInsightsSlide(props: GeneralInsightsSlideProps) {
  const strictBackendMetrics = props.general_insights_slide_present === true;

  const cards: InsightCard[] = [
    getMetricCard(
      props.reach_label || "Espectadores",
      formatDisplayNumber(props.reach_total),
      "Total unique audience in the period",
      props.metrics?.reach,
      undefined,
      !strictBackendMetrics
    ),
    getMetricCard(
      props.impressions_label || "Visualizaciones",
      formatDisplayNumber(props.impressions_total),
      "Total content exposures this month",
      props.metrics?.impressions,
      undefined,
      !strictBackendMetrics
    ),
    getMetricCard(
      "Frequency",
      `${props.frequency.toFixed(2)}x`,
      "Average times each user saw the content",
      props.metrics?.frequency,
      undefined,
      !strictBackendMetrics
    ),
    getMetricCard(
      "Followers",
      formatDisplayNumber(props.followers_total),
      "Current audience size",
      props.metrics?.followers,
      undefined,
      !strictBackendMetrics
    ),
    getMetricCard(
      "Followers Growth",
      formatDisplayNumber(props.followers_growth),
      "Net change during the period",
      props.metrics?.followers_growth,
      getTrend(props.followers_growth),
      !strictBackendMetrics
    ),
    getMetricCard(
      "Interactions",
      formatDisplayNumber(props.interactions_total),
      "Total engagement actions",
      props.metrics?.interactions,
      undefined,
      !strictBackendMetrics
    ),
    getMetricCard(
      "Link Clicks",
      formatDisplayNumber(props.link_clicks),
      "Traffic-driving actions",
      props.metrics?.link_clicks,
      undefined,
      !strictBackendMetrics
    ),
    getMetricCard(
      "Page Visits",
      formatDisplayNumber(props.page_visits),
      "Intent signals from profile traffic",
      props.metrics?.page_visits,
      undefined,
      !strictBackendMetrics
    ),
  ];

  return (
    <div className="flex h-full flex-col rounded-[32px] border border-white/10 bg-white/[0.04] p-7">
      <KPIGrid columns={4}>
        {cards.map((card) => (
          <KPICard
            key={card.label}
            label={card.label}
            value={card.value}
            meta={card.meta}
            trend={card.trend}
            unavailable={card.unavailable}
            className="h-[134px]"
          />
        ))}
      </KPIGrid>

      <InsightBox text={buildInsight(props)} className="mt-6 min-h-0 flex-1" />
    </div>
  );
}
