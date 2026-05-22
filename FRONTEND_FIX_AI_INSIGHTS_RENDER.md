## FRONTEND_FIX_AI_INSIGHTS_RENDER

### Componentes modificados

- `src/components/reports/primitives/InsightBox.tsx`
- `src/components/reports/slides/ReachSlide.tsx`
- `src/components/reports/ImpressionsSlide.tsx`
- `src/components/reports/slides/SummarySlide.tsx`
- `src/components/reports/report-view.helpers.ts`
- `src/lib/reports/templates/default-view-models.ts`

### Como se evito overflow

- La card reusable `InsightBox` ahora usa `overflow-hidden`, clamp configurable y tipografia mas compacta.
- Las slides metricas usan `max-h` fijo para la card de insight y `clampLines={5}`.
- La slide de summary usa `max-h` fijo tanto para `aiSummary` como para `recommendation`.
- No se agrego scroll interno.
- El texto largo se corta visualmente con `WebkitLineClamp`.

### Como se usa `insight_short`

- El source of truth sigue viniendo desde `report-view.helpers.ts`.
- Reach, Impressions y Engagement priorizan:
  - `insight_short`
  - `insightShort`
  - `insight`
  - `ai_summary`
  - `summary`
- El template oficial consume ese texto ya normalizado desde `default-view-models.ts`.

### Como se muestran fallbacks

- Si una metrica no tiene insight, se usa:
  - `Dato no disponible en este momento.`
- Si una metrica viene no disponible por permisos, se usa:
  - `Dato no disponible en este momento con los permisos actuales de Meta.`
- Se eliminaron fallbacks secos como:
  - `Impressions insights will appear here once the source includes enough contextual detail.`
  - `No highlighted insight is available yet.`
  - `Engagement insight is not available yet.`

### Build y lint

- `npm run build`: OK
- `npm run lint`: sigue fallando por errores preexistentes del repo en:
  - `src/components/dashboard/RecentReportCard.tsx`
  - `src/components/dashboard/ReportPreviewThumbnail.tsx`
  - `src/components/integrations/AdAccountSelector.tsx`
  - `src/components/reports/ReportExportSurface.tsx`

### Riesgos pendientes

- `SlideRenderer.tsx` todavia conserva ramas legacy de render por bloques. Esta correccion se aplico sobre el path oficial del template de 5 slides.
- Si algun reporte antiguo fuerza render block-based en vez del template oficial, puede seguir mostrando estilos distintos en insights legacy.
