# FRONTEND_FIX_METRIC_RENDER_5_SLIDES

## Como se renderiza N/A

El contrato nuevo de metricas ahora se respeta en el view model oficial:

- Si `is_available === false`, `isAvailable === false` o `available === false`, la metrica se marca como no disponible.
- Si el total explicito llega como `"N/A"`, tambien se trata como no disponible.
- Para Impressions y Engagement no disponibles se muestra `N/A`.
- El mensaje visible usa `unavailable_message`, `unavailableMessage`, `unavailable_reason`, `unavailableReason` o el fallback:
  `Dato no disponible en este momento con los permisos actuales de Meta.`

En estado no disponible:

- no se renderiza chart falso
- no se calculan highest/lowest falsos
- no se reemplaza la metrica con Reach ni con otro KPI

## Metricas disponibles vs no disponibles

Para metricas disponibles:

- se muestra `formatted_total`, `formattedTotal`, `formatted_value`, `formattedValue`, `total`, `value` o el alias especifico de la metrica
- si `daily_series.length > 0`, se renderiza el chart
- si todos los valores son `0`, se renderiza una linea plana valida
- si `daily_series.length === 0`, se muestra el placeholder real:
  `Daily series is not available for this metric yet.`

Para metricas no disponibles:

- Impressions muestra `N/A` y el mensaje de Meta
- Engagement muestra `N/A` y el mensaje de Meta
- no se muestran cards falsas de highest/lowest con `0`

## Daily charts

`normalizeDailySeries()` sigue siendo el source of truth en:

- `src/lib/reports/daily-series.ts`

Cambios aplicados:

- se lee `daily_series` primero
- no se convierte `"N/A"` a `0`
- no se filtran valores `0`
- no se fabrican dias faltantes hasta el final del periodo
- el chart muestra la primera y ultima fecha real recibida por backend

Tambien se retiro el uso de builders que completaban fechas con ceros en el render oficial de metricas.

## Summary

Slide 5 sigue usando el summary oficial:

- `src/components/reports/slides/SummarySlide.tsx`
- `src/lib/reports/templates/default-view-models.ts`

Se corrigio:

- nunca se renderizan objetos completos
- nunca debe aparecer `[object Object]`
- `formatMetricSummaryValue(metric)` respeta `is_available === false`
- `formatMetricSummaryDescription(metric)` usa `description` o `unavailable_message`
- Impressions y Engagement muestran `N/A` si no estan disponibles
- debajo de la card se muestra el mensaje de indisponibilidad cuando aplica

## Logo en headers

Slides 2, 3, 4 y 5 ya no muestran `METRIC` o `SUMMARY` como encabezado visual.

Se agrego un header logo pequeno compartido:

- `SlideHeaderLogo` en `src/components/reports/slides/shared.tsx`

Este componente:

- usa el logo resuelto del reporte
- cae al fallback de Measurable si no hay custom logo
- usa `object-contain`
- mantiene un contenedor claro sutil para contraste sobre fondo oscuro

Los modelos oficiales ahora pasan `branding` a:

- Reach
- Impressions
- Engagement
- Summary

## Development logs

Logs temporales agregados solo en development:

- `[5-slide metric render]`
- `[5-slide branding render]`
- `[5-slide summary render]`
- `[5-slide metric debug]`

Estos logs incluyen:

- `reportId`
- `slideNumber`
- `metricKey`
- `formattedTotal`
- `isAvailable`
- `unavailableReason`
- `unavailableMessage`
- `dailySeriesLength`
- `firstDate`
- `lastDate`
- `metricsSummary`

## Build / lint

- `npm run build`: exitoso
- `npm run lint`: falla por errores existentes del repo

Errores de lint pendientes:

- `react-hooks/set-state-in-effect` en `RecentReportCard.tsx`
- `react-hooks/set-state-in-effect` en `ReportPreviewThumbnail.tsx`
- `react-hooks/set-state-in-effect` en `AdAccountSelector.tsx`
- `react-hooks/set-state-in-effect` en `ReportExportSurface.tsx`

Tambien quedan warnings legacy de hooks, imagenes y variables no usadas fuera de este fix.

## Riesgos pendientes

- Falta validar visualmente con payload real de Facebook Pages e Instagram Business.
- `SlideRenderer.tsx` sigue teniendo deuda estructural, aunque no se creo otro renderer.
- `ImpressionsSlide.tsx` todavia contiene un `ImpressionsChart` legacy no usado.
- El build de Next sigue indicando `Skipping validation of types`, por lo que no reemplaza un typecheck dedicado.

