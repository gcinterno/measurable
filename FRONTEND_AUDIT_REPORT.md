# FRONTEND_AUDIT_REPORT

## 1. Resumen ejecutivo

El frontend está funcional, pero no está estabilizado alrededor de un único sistema de rendering de reportes. El mayor riesgo no es un bug aislado sino la coexistencia de varias capas que leen el mismo payload de formas distintas:

- `src/components/reports/SlideRenderer.tsx`
- `src/components/reports/ReportView.tsx`
- `src/components/reports/ReportPdfView.tsx`
- `src/components/reports/ReportSlidesDeck.tsx`
- `src/lib/reports/templates/default.ts`
- `src/components/reports/report-view.helpers.ts`

Hoy existe más de un “source of truth” para:

- orden de slides
- branding
- normalización de charts
- summary slide
- preview vs export

Esto explica varios síntomas reportados antes de producción:

- slides 5-slide que cambian según el path de render
- branding correcto en un lugar e incorrecto en otro
- charts que sí traen data pero caen en placeholder
- preview y export dependiendo de estructuras distintas
- lógica de Settings escribiendo branding en entidades distintas

Conclusión: el renderer oficial debe consolidarse alrededor de `SlideRenderer.tsx` + `report-view.helpers.ts` + `lib/reports/templates/default.ts`. `ReportSlidesDeck.tsx` y la resolución local de branding/chart en otros componentes son los duplicados más peligrosos.

---

## 2. Mapa del frontend

### Rutas principales

- `src/app/dashboard`
- `src/app/reports`
- `src/app/reports/[id]`
- `src/app/reports/[id]/export/pdf-view`
- `src/app/reports/new`
- `src/app/reports/new/flow`
- `src/app/reports/new/flow/sync`
- `src/app/reports/new/flow/generate`
- `src/app/reports/new/flow/review`
- `src/app/settings`
- `src/app/integrations`
- `src/app/integrations/meta`
- `src/app/integrations/meta/callback`
- `src/app/workspaces`
- `src/app/billing`
- `src/app/plans`
- `src/app/profile`
- `src/app/onboarding`
- `src/app/admin/*`

### Componentes principales

- `src/components/layout/*`
- `src/components/dashboard/*`
- `src/components/reports/*`
- `src/components/reports/slides/*`
- `src/components/reports/primitives/*`
- `src/components/integrations/*`
- `src/components/providers/*`
- `src/components/workspace/*`

### API clients

- `src/lib/api/reports.ts`
- `src/lib/api/workspaces.ts`
- `src/lib/api/me.ts`
- `src/lib/api/integrations.ts`
- `src/lib/api/auth.ts`
- `src/lib/api/datasets.ts`
- `src/lib/api/onboarding.ts`
- `src/lib/api/admin.ts`
- `src/lib/api/assistant.ts`

### Estado / hooks / sesión

- `src/lib/workspace/use-active-workspace.ts`
- `src/lib/workspace/session.ts`
- `src/lib/store/*`
- `src/lib/integrations/session.ts`
- No existe carpeta `src/hooks`; el estado compartido está repartido entre stores, helpers y hooks dentro de `src/lib`.

### Helpers / templates / branding

- `src/components/reports/report-view.helpers.ts`
- `src/lib/reports/templates/default.ts`
- `src/lib/reports/templates/default-view-models.ts`
- `src/lib/reports/branding.ts`
- `src/lib/reports/branding-snapshots.ts`
- `src/lib/reports/template-selection.ts`
- `src/lib/reports/export-pdf.ts`
- `src/lib/branding/measurable.ts`

### Charts

- `src/components/reports/slides/shared.tsx`
- `src/components/reports/primitives/ChartBlock.tsx`
- `src/components/reports/ImpressionsSlide.tsx`
- `src/components/reports/ReportSlidesDeck.tsx`
- `src/components/reports/SlideRenderer.tsx`

---

## 3. Auditoría de renderers de reportes

### Renderers detectados

#### Renderer 1: `SlideRenderer.tsx`

Archivo:

- `src/components/reports/SlideRenderer.tsx`

Rol actual:

- renderer dinámico principal para preview y export
- soporta block slides, overview slides, cover, summary y métricas
- contiene mucha lógica de normalización inline

Uso real detectado:

- `src/components/reports/ReportView.tsx`
- `src/components/reports/ReportPdfView.tsx`
- `src/components/reports/ReportExportSurface.tsx`
- `src/app/reports/new/flow/review/page.tsx`

Diagnóstico:

- hoy es el renderer con más alcance real
- también es el archivo más riesgoso por tamaño y mezcla de responsabilidades

#### Renderer 2: template system `default.ts`

Archivos:

- `src/lib/reports/templates/default.ts`
- `src/lib/reports/templates/default-view-models.ts`
- `src/components/reports/slides/*`

Rol actual:

- define secuencia de slides del template default
- construye modelos para cover, reach, impressions, engagement, summary

Diagnóstico:

- es el mejor candidato para formalizar la estructura oficial 5-slide
- pero hoy depende de datos ya normalizados por otra capa

#### Renderer 3: `ReportSlidesDeck.tsx`

Archivo:

- `src/components/reports/ReportSlidesDeck.tsx`

Problema:

- implementa cover, timeframe, branding, chart parsing e integración por su cuenta
- repite lógica que ya existe en `SlideRenderer.tsx`, `report-view.helpers.ts` y `branding.ts`
- no aparece como parte clara del path principal de preview/export actual

Diagnóstico:

- alto riesgo de ser renderer paralelo/legado
- candidato claro a retiro posterior, no a seguir extendiendo

### Cuántos renderers existen realmente

Hay al menos 3 caminos de render con responsabilidad parcial o total sobre reportes:

1. `SlideRenderer.tsx`
2. template renderer vía `default.ts`
3. `ReportSlidesDeck.tsx`

Además, `ReportPreviewThumbnail.tsx` crea un cuarto mini-path para cover thumbnail con resolución propia de branding.

### Si preview, PDF y export usan estructuras distintas

Sí.

- `ReportView.tsx` decide entre `SlideRenderer:block-slides` y `SlideRenderer:template-slides`
- `ReportPdfView.tsx` usa `SlideRenderer`
- `ReportExportSurface.tsx` vuelve a renderizar `SlideRenderer` offscreen
- `ReportPreviewThumbnail.tsx` renderiza `CoverSlide` directo con su propia resolución
- `ReportSlidesDeck.tsx` mantiene otro layout completo

### Source of truth recomendado para 5 slides

Debe ser:

1. Orden y composición: `src/lib/reports/templates/default.ts`
2. View model: `src/components/reports/report-view.helpers.ts` y `src/lib/reports/templates/default-view-models.ts`
3. Render único preview/export: `src/components/reports/SlideRenderer.tsx`

No debe ser:

- `ReportSlidesDeck.tsx`
- branding resuelto localmente por componente
- chart parsing duplicado en cada slide

---

## 4. Duplicados de componentes y renderers

### Duplicados peligrosos

- `src/components/reports/ReportSlidesDeck.tsx`
  - compite con `SlideRenderer.tsx`
- `src/components/reports/ImpressionsSlide.tsx`
  - contiene chart propio además de usar `MetricDailyChart`
- `src/components/reports/GeneralInsightsSlide.tsx`
  - nombre y responsabilidad se pisan con `slides/GeneralInsightsReportSlide.tsx`
- `src/components/reports/slides/ClosingSlide.tsx`
  - compite con `slides/SummarySlide.tsx` para slide final
- `src/components/dashboard/ReportPreviewThumbnail.tsx`
  - cover paralelo con branding local

### Componentes probablemente viejos o en riesgo de obsolescencia

- `src/components/reports/ReportSlidesDeck.tsx`
- `src/components/reports/slides/ClosingSlide.tsx`
- `src/components/reports/slides/GeneralInsightsReportSlide.tsx`
- partes de `src/components/reports/ImpressionsSlide.tsx` como `ImpressionsChart`

### Señales de duplicación visual

- wrappers oscuros generales más cards internas
- chart containers definidos en slides y también en primitives
- cover logic duplicada entre slides oficiales, thumbnail y deck legado

---

## 5. Helpers duplicados

### Branding

Helpers detectados:

- `src/lib/reports/branding.ts`
- `src/lib/api/reports.ts` con `extractReportBranding(...)`
- `src/lib/api/workspaces.ts` con `extractWorkspaceBranding(...)`
- `src/lib/api/me.ts` con `extractMeBranding(...)`
- `src/components/dashboard/ReportPreviewThumbnail.tsx` resuelve branding inline
- `src/components/reports/ReportSlidesDeck.tsx` usa fallback propio de brand name

Problema:

- la resolución de branding existe en varias capas con prioridades no idénticas
- report/workspace/user no están claramente jerarquizados desde un único helper

### Charts

Normalización duplicada detectada en:

- `src/components/reports/report-view.helpers.ts`
- `src/components/reports/SlideRenderer.tsx`
- `src/components/reports/ReportSlidesDeck.tsx`
- `src/components/reports/ImpressionsSlide.tsx`

Problema:

- el mismo payload puede interpretarse distinto según el renderer
- `0` y “sin data” no siempre están separados de forma consistente

### Template selection / branding snapshots

- `src/lib/reports/template-selection.ts`
- `src/lib/reports/branding-snapshots.ts`

No son un problema por sí mismos, pero aumentan el número de fuentes indirectas que afectan la vista final del reporte.

---

## 6. API clients duplicados o con señales de legado

### Reports

Archivo: `src/lib/api/reports.ts`

Funciones principales:

- `fetchReports` -> `GET /reports`
- `deleteReport` -> `DELETE /reports/{id}`
- `createReport` -> `POST /reports`
- `createMetaPagesReport` -> `POST /reports/meta-pages`
- `createInstagramBusinessReport` -> `POST /reports/instagram-business`
- `createMultiSourceReport` -> `POST /reports/multi-source`
- `fetchReportDetail` -> `GET /reports/{id}`
- `fetchReportVersions` -> `GET /reports/{id}/versions`
- `fetchReportVersionView` -> `GET /reports/{id}/versions/{versionId}`
- `fetchLatestReportRenderData` -> composición de detail + versions + version view
- `updateReportBlock` -> endpoint de update block en report version
- `exportReportPptx` -> export endpoint
- `downloadReportPdf` -> pdf endpoint

Riesgos detectados:

- `createReport` prueba múltiples payloads alternativos para el mismo endpoint
- los normalizers aceptan demasiadas variantes de naming
- señales fuertes de contrato backend/frontend aún no estabilizado

### Workspaces

Archivo: `src/lib/api/workspaces.ts`

Funciones:

- `fetchWorkspaces` -> `GET /workspaces`
- `fetchWorkspace` -> `GET /workspaces/{id}`
- `updateWorkspace` -> `PUT /workspaces/{id}`
- `resolveActiveWorkspace`

Riesgo:

- `updateWorkspace` solo escribe `name` y `logo_url`
- no existe operación explícita de `brand_name`
- frontend usa `workspace.name` como branding name

### Me

Archivo: `src/lib/api/me.ts`

Funciones:

- `fetchCurrentUser` -> `GET /me`
- `updateCurrentUser` -> `PUT /me`

Riesgo:

- branding del logo del usuario existe como ruta aparte
- entra en conflicto con branding por workspace

### Integrations

Archivo: `src/lib/api/integrations.ts`

Funciones principales:

- `connectMetaIntegration`
- `fetchIntegrationsConnectionStatus`
- `fetchMetaPages`
- `fetchMetaInstagramAccounts`
- `selectMetaPage`
- `syncMetaPages`
- `syncMetaInstagramAccount`
- `syncAllMetaDataSources`

Endpoints cubiertos:

- `integrations/meta/pages`
- `integrations/meta/instagram-accounts`
- `integrations/meta/sync-all`
- selección/sync de páginas e Instagram business

Riesgos:

- responses con `reach_daily` e `impressions_daily` viven aquí también
- parte del flujo de sync ya toca conceptos visuales que luego el renderer vuelve a reinterpretar

---

## 7. Rutas o flows duplicados

### New report flow

Rutas:

- `src/app/reports/new/flow/page.tsx`
- `src/app/reports/new/flow/sync/page.tsx`
- `src/app/reports/new/flow/generate/page.tsx`
- `src/app/reports/new/flow/review/page.tsx`

Estado compartido:

- `src/lib/integrations/session.ts`
- search params
- stores de preferencias

Riesgos:

- estado repartido entre query params, sesión local y stores
- branding temporal del generate flow vive separado de Settings
- template selection se persiste por otro helper distinto

### Dashboard reports

Archivos:

- `src/app/dashboard/page.tsx`
- `src/components/dashboard/RecentReportCard.tsx`
- `src/components/dashboard/ReportPreviewThumbnail.tsx`
- `src/components/reports/ReportLibraryCard.tsx`

Riesgo:

- el dashboard usa thumbnail de cover con path de render distinto al report detail

### Settings branding

Archivo principal:

- `src/app/settings/page.tsx`

Riesgo crítico:

- guardar branding: `updateWorkspace(...)`
- remover logo: `updateCurrentUser(...)`

Esto mezcla dos entidades para el mismo outcome visual.

---

## 8. Problemas detectados en branding

### Dónde se muestra / resuelve branding hoy

- Settings: `src/app/settings/page.tsx`
- Report detail preview: `src/components/reports/ReportView.tsx`
- PDF/export preview: `src/components/reports/ReportPdfView.tsx`
- Flow review: `src/app/reports/new/flow/review/page.tsx`
- Dashboard thumbnail: `src/components/dashboard/ReportPreviewThumbnail.tsx`
- Deck legado: `src/components/reports/ReportSlidesDeck.tsx`

### Problemas concretos

1. `workspace.name` se usa como brand name en Settings.

Archivo:

- `src/app/settings/page.tsx`

Señales:

- `setBrandNameDraft(currentWorkspace.name || preferences.brandName)`
- `updateWorkspace(... { name: nextBrandName, logoUrl })`

Riesgo:

- “workspace name” y “brand name” están acoplados

2. El remove logo usa `/me` y no `/workspaces/{id}`.

Archivo:

- `src/app/settings/page.tsx`

Riesgo:

- el mismo branding puede terminar dividido entre usuario y workspace

3. Existen varios resolvers de branding.

Archivos:

- `src/lib/reports/branding.ts`
- `src/lib/api/reports.ts`
- `src/lib/api/workspaces.ts`
- `src/lib/api/me.ts`
- `src/components/dashboard/ReportPreviewThumbnail.tsx`

4. El fallback de Measurable sí existe, pero no todos los componentes dependen del mismo helper.

Archivos:

- `src/lib/branding/measurable.ts`
- `src/lib/reports/branding.ts`

5. `ReportPreviewThumbnail.tsx` resuelve cover branding por cuenta propia.

Riesgo:

- dashboard y report detail pueden diferir visualmente

### Helper oficial recomendado

Crear y consolidar uso futuro sobre una firma única:

```ts
resolveReportBranding(report, workspace, user)
```

Debe devolver:

```ts
{
  logoUrl,
  brandName
}
```

Fallback oficial recomendado:

- `logoUrl = MEASURABLE_BRAND_LOGO_URL`
- `brandName = "Measurableapp.com Report Generator"`

El helper existente más cercano a esto es `src/lib/reports/branding.ts`. Ese debe ser el punto de unificación.

---

## 9. Problemas detectados en daily charts

### Chart components detectados

1. `MetricDailyChart`
   - `src/components/reports/slides/shared.tsx`
2. `ChartBlock`
   - `src/components/reports/primitives/ChartBlock.tsx`
3. `ImpressionsChart`
   - `src/components/reports/ImpressionsSlide.tsx`
4. parsing de series dentro de `ReportSlidesDeck.tsx`
5. parsing de series dentro de `SlideRenderer.tsx`

### Problemas concretos

1. No hay una sola normalización de `daily_series`.

Archivos:

- `src/components/reports/report-view.helpers.ts`
- `src/components/reports/SlideRenderer.tsx`
- `src/components/reports/ReportSlidesDeck.tsx`

2. Existen demasiados fallbacks y no están centralizados.

Se detectaron lecturas desde:

- `daily_series`
- `chart_data`
- `dailyChart`
- `metric.daily_series`
- `data.daily_series`
- `reach_daily`
- `impressions_daily`
- `engagement_daily`

3. `0` y “sin data” son riesgosos si una capa usa truthiness simple.

La regla correcta debe ser:

- si `daily_series.length > 0`, renderizar chart
- si todos los valores son `0`, renderizar línea plana
- solo placeholder si el array está vacío

4. `ImpressionsSlide.tsx` todavía carga complejidad propia de chart.

Riesgo:

- el renderer compartido y el slide pueden divergir

### Componente que debe quedar como base

`MetricDailyChart` en `src/components/reports/slides/shared.tsx`

### Qué estaba funcionando antes

El chart compartido parece el camino más consistente porque ya se usa desde:

- `ReachSlide.tsx`
- `ImpressionsSlide.tsx`
- `SlideRenderer.tsx`

El problema no es tanto el dibujo del chart, sino la duplicación de normalización previa.

---

## 10. Problemas detectados en template Executive 5 slides

### Estructura oficial deseada

1. Slide 1 = Cover
2. Slide 2 = Reach
3. Slide 3 = Impressions
4. Slide 4 = Engagement
5. Slide 5 = Summary final + AI interpretation

### Problemas detectados

1. Orden no totalmente centralizado.

El orden vive entre:

- `default.ts`
- `default-view-models.ts`
- `SlideRenderer.tsx`
- orden real de blocks/version view

2. Card dentro de card.

Se observan wrappers generales + cards internas en slides métricas:

- `src/components/reports/slides/ReachSlide.tsx`
- `src/components/reports/ImpressionsSlide.tsx`
- `src/components/reports/GeneralInsightsSlide.tsx`
- variantes dentro de `SlideRenderer.tsx`

3. Executive tiene layout duplicado entre slides oficiales y renderer por blocks.

4. Progress dots, frame y viewport no están claramente desacoplados del contenido.

Archivos relacionados:

- `src/components/reports/SlideCanvas.tsx`
- `src/components/reports/SlideDeckViewport.tsx`
- `src/components/reports/primitives/ReportSlideCanvas.tsx`

5. Scaling preview/export depende de varios shells.

Archivos:

- `ReportView.tsx`
- `ReportPdfView.tsx`
- `ReportExportSurface.tsx`
- `export-pdf.ts`

### Riesgo principal del Executive

Se percibe como un template, pero en realidad parte de su layout está duplicada entre:

- template slides
- block renderer
- deck legado

---

## 11. Problemas detectados en Summary slide

### Situación actual

Hay varias nociones de slide final:

- `slides/ClosingSlide.tsx`
- `slides/SummarySlide.tsx`
- `ExecutiveSummarySlide` dentro de `SlideRenderer.tsx`
- summary derivado desde `report-view.helpers.ts`

### Riesgos

- slide 5 puede venir del backend o construirse por fallback
- si esto no se centraliza, preview y export pueden mostrar cierres distintos
- cierre genérico “fin del reporte” y summary real han coexistido

### Recomendación

Mantener un solo modelo de summary final con:

- `metrics_summary`
- `ai_summary`
- `recommendation`
- fallback desde slides 2-4

Pero la construcción debe vivir en una sola capa, idealmente `default-view-models.ts` o un helper dedicado.

---

## 12. API contract audit

### Reports API

Archivo: `src/lib/api/reports.ts`

| Función | Endpoint | Método | Payload/entrada | Respuesta esperada | Observación |
|---|---|---|---|---|---|
| `fetchReports` | `/reports` | `GET` | none | lista de reports | tolera `reports/items/data` |
| `deleteReport` | `/reports/{id}` | `DELETE` | none | vacío o texto | usa `fetch` manual y logs |
| `createReport` | `/reports` | `POST` | múltiples payloads alternativos | id de reporte | fuerte señal de contrato inestable |
| `createMetaPagesReport` | `/reports/meta-pages` | `POST` | `dataset_id`, `timeframe`, `requested_slides`, `ai_mode`, `locale` | report id | específico meta pages |
| `createInstagramBusinessReport` | `/reports/instagram-business` | `POST` | `integration_id`, `account_id`, timeframe | report id | específico Instagram |
| `createMultiSourceReport` | `/reports/multi-source` | `POST` | `sources[]`, timeframe, locale | report id | para multi-source |
| `fetchReportDetail` | `/reports/{id}` | `GET` | auth opcional | report detail | normaliza branding y blocks |
| `fetchReportVersions` | `/reports/{id}/versions` | `GET` | auth opcional | versiones | tolera varias shapes |
| `fetchReportVersionView` | `/reports/{id}/versions/{versionId}` | `GET` | auth opcional | locale, description, branding, blocks | parsea `data_json` |
| `fetchLatestReportRenderData` | compuesto | n/a | reportId | detail + versions + reportVersion | path principal de render |
| `updateReportBlock` | report version block update | `PUT/PATCH` implícito en archivo | block content | block actualizado | revisar al refactorizar |
| `exportReportPptx` | export route | `POST/GET` según implementación | reportId | archivo PPTX | ligado a export |
| `downloadReportPdf` | export route | `GET` | reportId | archivo PDF | posible coexistencia con export client-side |

### Workspaces API

Archivo: `src/lib/api/workspaces.ts`

| Función | Endpoint | Método | Payload/entrada | Respuesta esperada | Observación |
|---|---|---|---|---|---|
| `fetchWorkspaces` | `/workspaces` | `GET` | none | lista de workspaces | normaliza branding |
| `fetchWorkspace` | `/workspaces/{id}` | `GET` | auth opcional | workspace detail | branding incluido |
| `updateWorkspace` | `/workspaces/{id}` | `PUT` | `name`, `logo_url` | workspace actualizado | no expone `brand_name` explícito |

### Me API

Archivo: `src/lib/api/me.ts`

| Función | Endpoint | Método | Payload/entrada | Respuesta esperada | Observación |
|---|---|---|---|---|---|
| `fetchCurrentUser` | `/me` | `GET` | none | user | branding solo logo |
| `updateCurrentUser` | `/me` | `PUT` | `logo_url` | user actualizado | conflicto con workspace branding |

### Integrations API

Archivo: `src/lib/api/integrations.ts`

Cobertura:

- connect Meta
- fetch pages
- fetch Instagram accounts
- select page/account
- sync page
- sync Instagram
- sync all

Endpoints esperados:

- `/integrations/meta/pages`
- `/integrations/meta/instagram-accounts`
- `/integrations/meta/sync-all`
- rutas de connect/select/sync específicas

Observación:

- parte de la data diaria se valida/loguea aquí, antes del renderer

---

## 13. Riesgos visuales

1. Slides con aspect ratio dependiente del shell.

Archivos:

- `ReportView.tsx`
- `ReportPdfView.tsx`
- `ReportExportSurface.tsx`
- `export-pdf.ts`

2. Mobile y preview pueden divergir por escala transformada y wrappers extra.

3. Cards anidadas.

Archivos:

- métricas Executive y variantes block renderer

4. Insights largos sin clamp unificado.

Archivos:

- `src/components/reports/primitives/InsightBox.tsx`
- variantes dentro de `SlideRenderer.tsx`

5. Chart containers sin única autoridad de tamaño.

Archivos:

- `ChartBlock.tsx`
- `MetricDailyChart`
- `SlideRenderer.tsx`

6. Logos oscuros sobre fondo oscuro.

Archivos:

- `CoverSlide.tsx`
- `slides/shared.tsx`
- `ReportPreviewThumbnail.tsx`

7. Export preview diferente del preview web por render offscreen separado.

8. Thumbnail cover distinto del cover real.

Archivo:

- `ReportPreviewThumbnail.tsx`

---

## 14. Source of truth recomendado

### Renderer oficial recomendado

- `src/components/reports/SlideRenderer.tsx`

### Composición oficial del template 5-slide

- `src/lib/reports/templates/default.ts`

### Normalización oficial del payload visual

- `src/components/reports/report-view.helpers.ts`
- `src/lib/reports/templates/default-view-models.ts`

### Branding oficial

- `src/lib/reports/branding.ts`

### Chart oficial

- `MetricDailyChart` en `src/components/reports/slides/shared.tsx`

### Qué no debe ser source of truth

- `ReportSlidesDeck.tsx`
- `ReportPreviewThumbnail.tsx` para branding
- `Settings` usando `workspace.name` como semántica de brand name
- charts locales por slide

---

## 15. Plan de unificación por fases

### Fase 1: congelar crecimiento de duplicados

- no agregar más lógica a `ReportSlidesDeck.tsx`
- no agregar más resoluciones locales de branding
- no agregar charts nuevos por slide

### Fase 2: fijar contrato visual

- definir que 5-slide usa siempre:
  - cover
  - reach
  - impressions
  - engagement
  - summary
- fijar `metric_key`, `slide_type`, `slide_number` como orden canónico

### Fase 3: branding único

- consolidar `resolveReportBranding(report, workspace, user)`
- quitar dependencias de `workspace.name` como brand name
- unificar escritura de branding en una sola entidad

### Fase 4: chart normalization única

- mover toda resolución de `daily_series` a un helper único
- hacer que `SlideRenderer` y template slides consuman series ya normalizadas

### Fase 5: summary único

- un único `SummarySlideModel`
- un único fallback desde slides 2-4

### Fase 6: retiro controlado

- retirar `ReportSlidesDeck.tsx`
- retirar `ImpressionsChart`
- retirar `ClosingSlide.tsx` si queda absorbido por summary oficial

---

## 16. Qué NO tocar todavía

- rutas del App Router
- flujo de generación backend
- endpoints existentes
- stores globales sin antes fijar source of truth
- estilos masivos del dashboard
- refactor grande de `SlideRenderer.tsx` sin pruebas visuales

---

## 17. Quick wins seguros

1. Documentar oficialmente que el renderer principal es `SlideRenderer.tsx`.
2. Marcar `ReportSlidesDeck.tsx` como legacy/internal y evitar nuevas llamadas.
3. Crear helper único de normalización de `daily_series`.
4. Crear helper único de branding a nivel reporte.
5. Hacer que `ReportPreviewThumbnail.tsx` consuma el mismo helper de branding.
6. Separar semánticamente `workspace.name` de `brand_name`.
7. Revisar el remove logo de Settings para que no escriba en `/me` si el branding oficial es workspace-level.

---

## 18. Cambios riesgosos que requieren cuidado

1. Reescribir `SlideRenderer.tsx`.
2. Eliminar `ReportSlidesDeck.tsx` sin mapear dependencias reales.
3. Cambiar contrato de branding sin revisar Settings, review flow, dashboard y export.
4. Centralizar charts sin validar preview, PDF y PPTX.
5. Unificar summary slide sin probar payloads viejos.

---

## 19. Lista de archivos candidatos a refactor

- `src/components/reports/SlideRenderer.tsx`
- `src/components/reports/report-view.helpers.ts`
- `src/lib/reports/templates/default.ts`
- `src/lib/reports/templates/default-view-models.ts`
- `src/lib/reports/branding.ts`
- `src/components/dashboard/ReportPreviewThumbnail.tsx`
- `src/app/settings/page.tsx`
- `src/components/reports/ImpressionsSlide.tsx`
- `src/components/reports/slides/shared.tsx`
- `src/lib/api/reports.ts`
- `src/lib/api/workspaces.ts`
- `src/lib/api/me.ts`

---

## 20. Lista de archivos candidatos a eliminar después

No eliminarlos aún.

- `src/components/reports/ReportSlidesDeck.tsx`
- `src/components/reports/slides/ClosingSlide.tsx`
- `src/components/reports/slides/GeneralInsightsReportSlide.tsx`
- implementación local `ImpressionsChart` dentro de `src/components/reports/ImpressionsSlide.tsx`

---

## 21. Problemas principales encontrados

1. No existe un único source of truth para render de reportes 5-slide.
2. Branding se resuelve en varias capas y se escribe en entidades distintas.
3. Chart normalization está duplicada.
4. Preview, export y thumbnail no dependen exactamente del mismo árbol lógico.
5. El template Executive tiene layout repetido entre template slides, block renderer y deck legado.

---

## 22. Duplicados más peligrosos

1. `SlideRenderer.tsx` vs `ReportSlidesDeck.tsx`
2. `SummarySlide.tsx` vs `ClosingSlide.tsx` vs `ExecutiveSummarySlide`
3. `MetricDailyChart` vs `ImpressionsChart` + parsers locales
4. `resolveReportBranding` vs extractors en `api/reports`, `api/workspaces`, `api/me`
5. `ReportPreviewThumbnail.tsx` resolviendo branding por su cuenta

---

## 23. Siguiente paso recomendado

No hacer refactor masivo todavía.

El siguiente paso correcto es una fase corta de consolidación controlada:

1. declarar oficialmente `SlideRenderer.tsx` como renderer único
2. declarar `default.ts` como orden oficial del template 5-slide
3. extraer dos helpers compartidos:
   - `resolveReportBranding(report, workspace, user)`
   - `resolveMetricDailySeries(slideOrBlock)`
4. alinear `Settings` para que branding no se escriba a veces en workspace y a veces en user
5. recién después retirar renderers/componentes legados

