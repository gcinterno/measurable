import type { ReportVersionBlock } from "@/types/report";

export type ExecutiveDarkKpi = {
  id: string;
  label: string;
  value: string;
  featured: boolean;
};

export type ExecutiveDarkParseError = {
  id: string;
  type: string;
  message: string;
};

export type ExecutiveDarkViewModel = {
  title: string;
  subtitle: string;
  periodLabel: string;
  deliveryLabel: string;
  deckLabel: string;
  kpis: ExecutiveDarkKpi[];
  heroMetrics: ExecutiveDarkKpi[];
  primaryNarrative: string;
  premiumInsight: string;
  secondaryNarrative: string;
  parseErrors: ExecutiveDarkParseError[];
};

type ClassifiedTextBlock = {
  id: string;
  text: string;
  role: "summary" | "ai_summary" | "recent_posts_summary" | "generic";
  invalid: boolean;
};

function getTrimmedText(value: string | null | undefined) {
  return value?.trim() || "";
}

function getStatValue(value: ReportVersionBlock["data"]["value"]) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  return String(value);
}

function safeParseBlock(rawDataJson: string) {
  if (!rawDataJson) {
    return { invalid: false };
  }

  try {
    JSON.parse(rawDataJson);
    return { invalid: false };
  } catch {
    return { invalid: true };
  }
}

function inferTextRole(
  block: ReportVersionBlock,
  index: number
): ClassifiedTextBlock["role"] {
  const raw = block.rawDataJson.toLowerCase();
  const text = getTrimmedText(block.data.text).toLowerCase();

  if (raw.includes("ai_summary") || text.includes("insight")) {
    return "ai_summary";
  }

  if (
    raw.includes("recent_posts_summary") ||
    text.includes("recent post") ||
    text.includes("publicacion") ||
    text.includes("post")
  ) {
    return "recent_posts_summary";
  }

  if (raw.includes("summary") || index === 0) {
    return "summary";
  }

  return "generic";
}

function formatPeriodLabel() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 27);

  const formatter = new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

function getPreferredText(
  texts: ClassifiedTextBlock[],
  roles: ClassifiedTextBlock["role"][]
) {
  for (const role of roles) {
    const match = texts.find((textBlock) => textBlock.role === role);

    if (match?.text) {
      return match.text;
    }
  }

  return "";
}

export function buildExecutiveDarkViewModel(
  blocks: ReportVersionBlock[]
): ExecutiveDarkViewModel {
  const parseErrors: ExecutiveDarkParseError[] = [];

  const titleBlock = blocks.find((block) => block.type === "title");
  const title = getTrimmedText(titleBlock?.data.text) || "Executive Monthly Report";

  const textBlocks = blocks
    .filter((block) => block.type === "text")
    .map((block, index) => {
      const parseState = safeParseBlock(block.rawDataJson);

      if (parseState.invalid) {
        parseErrors.push({
          id: block.id,
          type: block.type,
          message: "Un bloque de texto no pudo interpretarse correctamente.",
        });
      }

      return {
        id: block.id,
        text: getTrimmedText(block.data.text),
        role: inferTextRole(block, index),
        invalid: parseState.invalid,
      } satisfies ClassifiedTextBlock;
    })
    .filter((block) => block.text);

  const kpis = blocks
    .filter((block) => block.type === "stat")
    .map((block, index) => {
      const parseState = safeParseBlock(block.rawDataJson);

      if (parseState.invalid) {
        parseErrors.push({
          id: block.id,
          type: block.type,
          message: "Un KPI no pudo interpretarse correctamente.",
        });
      }

      return {
        id: block.id,
        label: getTrimmedText(block.data.label) || `KPI ${index + 1}`,
        value: getStatValue(block.data.value),
        featured: index === 0,
      } satisfies ExecutiveDarkKpi;
    });

  const subtitle =
    getPreferredText(textBlocks, ["summary", "generic", "ai_summary"]) ||
    "Resumen ejecutivo del periodo analizado con foco en resultados y lectura directiva.";

  const primaryNarrative =
    getPreferredText(textBlocks, ["summary", "generic", "recent_posts_summary"]) ||
    "No hay narrativa principal disponible todavía para este reporte.";

  const premiumInsight =
    getPreferredText(textBlocks, ["ai_summary", "generic", "summary"]) ||
    "No hay un insight destacado disponible todavía.";

  const secondaryNarrative =
    getPreferredText(textBlocks, ["recent_posts_summary", "generic", "summary"]) ||
    "No hay contexto adicional disponible para este periodo.";

  return {
    title,
    subtitle,
    periodLabel: formatPeriodLabel(),
    deliveryLabel: "Monthly Results Review",
    deckLabel: "Executive Dark · 05 slides",
    kpis,
    heroMetrics: kpis.slice(0, 3),
    primaryNarrative,
    premiumInsight,
    secondaryNarrative,
    parseErrors,
  };
}
