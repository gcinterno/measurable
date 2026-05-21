# FRONTEND_UNIFICATION_PHASE_1

## 1. Source of truth definido

Quedó fijado explícitamente lo siguiente:

- Renderer principal: `src/components/reports/SlideRenderer.tsx`
- Estructura oficial del 5-slide: `src/lib/reports/templates/default.ts`
- Branding oficial: `src/lib/reports/branding.ts` con `resolveReportBranding()`
- Daily series oficial: `src/lib/reports/daily-series.ts` con `normalizeDailySeries()`
- Summary oficial para 5 slides: `src/components/reports/slides/SummarySlide.tsx`

La estructura oficial mantenida es:

1. Cover
2. Reach
3. Impressions
4. Engagement
5. Summary

## 2. Componentes legacy que siguen vivos

No se borró ningún archivo. Los siguientes quedaron marcados como legacy o compatibilidad:

- `src/components/reports/ReportSlidesDeck.tsx`
- `src/components/reports/slides/ClosingSlide.tsx`
- `ExecutiveSummarySlide` dentro de `src/components/reports/SlideRenderer.tsx`
- partes locales de preprocessing/chart en `src/components/reports/ImpressionsSlide.tsx`
- `src/components/dashboard/ReportPreviewThumbnail.tsx` sigue renderizando cover directo, pero ya usa el helper oficial de branding

## 3. Componentes que ahora delegan al source of truth

- `ReportSlidesDeck.tsx` ya no mantiene lógica paralela; ahora delega a `SlideRenderer`
- `ReportView.tsx` pasa `reportId` al renderer oficial para logs y trazabilidad
- `ReportPdfView.tsx` pasa `reportId` al renderer oficial
- `ReportExportSurface.tsx` pasa `reportId` al renderer oficial cuando está disponible
- `reports/new/flow/review/page.tsx` pasa `reportId` al renderer oficial
- `ReportPreviewThumbnail.tsx` dejó de resolver branding inline y ahora usa `resolveReportBranding()`
- `report-view.helpers.ts` consume `normalizeDailySeries()` para métricas y summary data derivada
- `SlideRenderer.tsx` consume `resolveReportBranding()` y `normalizeDailySeries()`

## 4. Qué no se tocó todavía

- No se borraron componentes legacy
- No se cambiaron rutas públicas
- No se hizo refactor masivo de `SlideRenderer.tsx`
- No se reescribió `Settings`
- No se unificó todavía la escritura de branding entre `workspace` y `/me`
- No se retiró el path block-based para decks de más de 5 slides
- No se hizo limpieza final de charts/helpers duplicados fuera de la capa oficial

## 5. Pruebas manuales recomendadas

1. Abrir un reporte de 5 slides de Facebook Pages en preview y validar orden 1-5.
2. Abrir un reporte de 5 slides de Instagram Business en preview y validar orden 1-5.
3. Validar que slide 1 siempre muestre logo fallback o custom y brand name fallback o custom.
4. Validar que slide 2 renderice Reach con chart cuando exista `daily_series`.
5. Validar que slide 3 renderice Impressions con chart incluso si todos los valores son `0`.
6. Validar que slide 4 renderice Engagement con chart o placeholder real solo si no hay serie.
7. Validar que slide 5 muestre Summary final y no cierre genérico.
8. Validar dashboard thumbnail contra el cover real del reporte.
9. Validar export PDF visualmente contra preview web.
10. Validar review flow con reportes recién generados.

## 6. Riesgos pendientes

- `Settings` sigue mezclando branding de workspace con branding de usuario en ciertas acciones
- `SlideRenderer.tsx` sigue siendo un archivo demasiado grande
- `ExecutiveSummarySlide` sigue existiendo para block decks largos
- `ImpressionsSlide.tsx` todavía conserva helpers locales que deberían consolidarse después
- El script `npm run lint` del repo no devolvió resultado útil en esta sesión; hay que revisar su configuración/alcance
- `next build` compila, pero el build actual indica `Skipping validation of types`, así que no reemplaza un typecheck dedicado

## 7. Próxima fase recomendada

Fase 2 debería enfocarse en consolidación funcional, no en limpieza destructiva:

1. Mover toda normalización de metric slides al helper compartido y retirar parsing duplicado restante.
2. Unificar summary block-based y summary template-based alrededor de un solo `SummarySlideModel`.
3. Corregir definitivamente `Settings` para que branding escriba en una sola entidad.
4. Alinear dashboard thumbnail con el mismo árbol visual del cover oficial, no solo con el helper de branding.
5. Retirar gradualmente lógica paralela restante en `ImpressionsSlide.tsx` y componentes heredados.

## 8. Validación ejecutada en esta fase

- `npm run build`: exitoso
- `npm run lint`: el script no entregó salida final útil en esta sesión
- Typecheck dedicado: no existe script formal en `package.json`

