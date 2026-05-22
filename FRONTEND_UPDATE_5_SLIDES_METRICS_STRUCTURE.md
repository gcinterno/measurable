# FRONTEND UPDATE 5 SLIDES METRICS STRUCTURE

## Mini-auditoría

Source of truth confirmado antes de editar:

- `src/components/reports/SlideRenderer.tsx`
- `src/lib/reports/templates/default.ts`
- `src/lib/reports/daily-series.ts` via `normalizeDailySeries()`
- `src/components/reports/report-view.helpers.ts`
- `src/lib/reports/templates/default-view-models.ts`
- `src/components/reports/slides/SummarySlide.tsx`
- templates visuales `executive`, `simple`, `modern` comparten el mismo flow de modelo y render oficial

Hallazgos:

- El orden oficial del 5-slide seguía siendo `cover > reach > impressions > engagement > summary`.
- `ReachSlide` ya funcionaba como renderer métrico compartido. No fue necesario crear otro renderer.
- `report-view.helpers.ts` ya era la pieza que resolvía disponibilidad, insights y daily series a partir de bloques reales.
- `SummarySlide` seguía renderizando `Impressions` y solo mostraba 3 cards.
- `normalizeDailySeries()` mezclaba claves métricas distintas y podía reciclar series de otra métrica si el bloque traía varios payloads.

## Nuevo orden oficial

Se actualizó el orden oficial a:

1. `cover`
2. `reach`
3. `engagement`
4. `page_views`
5. `summary`

Archivos:

- `src/lib/reports/templates/default.ts`
- `src/components/reports/SlideRenderer.tsx`
- `src/components/reports/report-view.helpers.ts`

## Componentes modificados

- `src/lib/reports/templates/default.ts`
- `src/lib/reports/templates/default-view-models.ts`
- `src/components/reports/report-view.helpers.ts`
- `src/lib/reports/daily-series.ts`
- `src/components/reports/slides/SummarySlide.tsx`
- `src/components/reports/SlideRenderer.tsx`

## Cómo se renderiza Engagement

Slide 3 ahora usa:

- `metric_key = "engagement"`
- `formatted_total` si existe
- `daily_series` real normalizada
- `highest_day`
- `lowest_day`
- `insight_short || insight || ai_summary || summary`

Reglas aplicadas:

- Si backend marca la métrica como no disponible, se muestra `N/A`.
- Se usa `unavailable_message` como texto principal en insight cuando la métrica no está disponible.
- No se renderiza chart si la métrica está `N/A`.
- Si la serie existe y todos los valores son `0`, sí se renderiza la línea plana.

## Cómo se renderiza Page Views

Slide 4 ahora usa:

- `metric_key = "page_views"`
- aliases soportados para total y series:
  - `page_views`
  - `page_visits`
  - `profile_views`
- `daily_series` real via `normalizeDailySeries()`
- `highest_day`
- `lowest_day`
- `insight_short || insight || ai_summary || summary`

Reglas aplicadas:

- Si backend marca `is_available = false` o manda `N/A`, se muestra `N/A`.
- Se usa el mensaje:
  `Dato no disponible en este momento con los permisos actuales de Meta.`
- No se renderiza chart falso.
- No se muestran highest/lowest falsos si la métrica no está disponible.

## Cómo se actualizó Summary

Slide 5 ahora muestra 4 cards:

1. Reach
2. Engagement
3. Followers
4. Page Views

Comportamiento:

- Ya no se renderiza `Impressions`.
- Cada card consume `formatted_value`, `value`, `is_available` y `description` si existen.
- Si la métrica no está disponible, se muestra `N/A`.
- Debajo se usa `description` o `unavailable_message`.
- Se evitó renderizar objetos completos para no mostrar `[object Object]`.

También se ajustó `SummarySlide` para usar `KPIGrid columns={4}`.

## Daily charts

`normalizeDailySeries()` quedó ajustado para funcionar correctamente con:

- `reach`
- `engagement`
- `page_views`
- `impressions` legacy

Reglas aplicadas:

- Solo usa series compatibles con la métrica inferida del bloque.
- Ya no recicla `reach_daily` para `engagement` o `page_views`.
- Ya no recicla `impressions_daily` para `page_views`.
- Si existe `daily_series`, la usa.
- Si no hay serie real y la métrica está unavailable, no inventa chart.

## Templates executive / simple / modern

No se creó un sistema paralelo.

- El cambio ocurre en el pipeline oficial de modelos.
- `executive`, `simple` y `modern` siguen usando el mismo source of truth para contenido.
- Las diferencias visuales siguen delegadas al template activo, no a otro renderer.

## Build / lint ejecutados

### `npm run build`

Resultado: exitoso.

- Next compiló correctamente.
- El build de producción terminó bien.
- Next indicó `Skipping validation of types`, por lo que este paso no valida los errores globales de TypeScript del repo.

### `npm run lint`

Resultado: falló por problemas preexistentes fuera de este cambio.

Errores reportados por eslint:

- `src/components/dashboard/RecentReportCard.tsx`
- `src/components/dashboard/ReportPreviewThumbnail.tsx`
- `src/components/integrations/AdAccountSelector.tsx`
- `src/components/reports/ReportExportSurface.tsx`

Además hay warnings previos en múltiples archivos no tocados en esta tarea.

### `npx tsc --noEmit`

Resultado: falló por errores globales preexistentes del repo.

No quedaron errores nuevos visibles asociados a:

- `src/lib/reports/daily-series.ts`
- `src/components/reports/report-view.helpers.ts`
- `src/lib/reports/templates/default-view-models.ts`
- `src/lib/reports/templates/default.ts`
- `src/components/reports/slides/SummarySlide.tsx`

Persisten errores previos en otras áreas y también errores genéricos ya existentes en `default.ts` por typing de `ReportTemplate`.

## Riesgos pendientes

- Si backend manda `page_views` bajo una clave nueva no contemplada, habrá que agregar ese alias en `report-view.helpers.ts` y `daily-series.ts`.
- El path block-based de `SlideRenderer.tsx` quedó reordenado, pero su capa legacy sigue teniendo deuda técnica fuera de este cambio.
- El repo mantiene errores globales de TypeScript y eslint que dificultan una validación completamente limpia.
- `buildImpressionsSlideModel()` se dejó vivo como legacy para no borrar componentes previos, pero ya no forma parte del orden oficial del 5-slide.
