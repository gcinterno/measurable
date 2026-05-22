# Frontend Feature: User Suggestions

## Mini-auditoria

- AI Assistant floating button: vive en `src/components/layout/AppAssistantBubble.tsx`, montado desde `src/components/layout/AppShell.tsx`. Usa `fixed`, `right`, `bottom` y `z-40/z-50`.
- Floating widgets: no habia otro sistema flotante general. Se reutilizo el patron de posicion y estilo del AI Assistant.
- Admin page: `src/app/admin/page.tsx` usa `AdminPageShell` y carga metricas desde `src/lib/api/admin.ts`.
- Integrations page: `src/app/integrations/page.tsx` renderiza el grid de `IntegrationCard` y maneja el flujo Meta.
- API clients: el patron principal es `apiFetch` desde `src/lib/api.ts`. Admin centraliza endpoints admin en `src/lib/api/admin.ts`.
- Branding/logo assets: se reutilizo `/brand/measurable-logo.svg`.

## Componentes creados/reutilizados

- Creado: `src/components/suggestions/UserSuggestionModal.tsx`
  - Modal reutilizable para enviar sugerencias.
  - Valida mensaje no vacio.
  - Limita a 1000 caracteres.
  - Muestra loading, confirmacion y error.
  - No usa `localStorage`.
- Reutilizado/modificado: `src/components/layout/AppAssistantBubble.tsx`
  - Agrega boton flotante pequeno de sugerencias arriba del AI Assistant.
  - Mantiene el sistema flotante existente del assistant.
- Reutilizado: `AdminPageShell`, `IntegrationCard`, asset de logo Measurable.

## Rutas modificadas

- `/admin`: `src/app/admin/page.tsx`
  - Nueva seccion "Sugerencias de usuarios".
  - Muestra mensaje, usuario, workspace, fecha y status.
  - Orden newest first desde normalizacion frontend.
  - Empty state: "Aún no hay sugerencias."
  - Acciones: Reviewed y Archived mediante PATCH.
- `/integrations`: `src/app/integrations/page.tsx`
  - Nuevo banner inferior debajo del grid principal.
  - Boton secundario "Enviar sugerencia" abre el mismo modal.

## API clients agregados

- `src/lib/api/suggestions.ts`
  - `createSuggestion(message)` llama `POST /suggestions` con `{ message }`.
- `src/lib/api/admin.ts`
  - `getAdminSuggestions()` llama `GET /admin/suggestions`.
  - `updateSuggestionStatus(suggestionId, status)` llama `PATCH /admin/suggestions/:id`.

## Conexion con Admin

La sugerencia se crea desde el modal usando `POST /suggestions`. La pagina Admin carga sugerencias con `GET /admin/suggestions` y las muestra en una seccion independiente de las metricas para no bloquear ni alterar el dashboard existente.

## Banner de Integrations

El banner se agrego al final de `src/app/integrations/page.tsx`, despues del grid de integraciones. Usa un contenedor responsive con maximo visual de `1400px`, altura minima de `180px`, logo de Measurable y CTA que abre `UserSuggestionModal`.

## Build/lint ejecutados

- `npm run build`: OK.
- `npm run lint`: falla por errores preexistentes fuera de esta feature:
  - `src/components/dashboard/RecentReportCard.tsx`
  - `src/components/dashboard/ReportPreviewThumbnail.tsx`
  - `src/components/integrations/AdAccountSelector.tsx`
  - `src/components/reports/ReportExportSurface.tsx`
- `npx tsc --noEmit`: falla por errores preexistentes en dashboard, integrations meta, i18n, AppShell, settings y report rendering. Los errores detectados inicialmente en archivos tocados por esta feature fueron corregidos.

## Riesgos pendientes

- El frontend asume que existen `GET /admin/suggestions` y `PATCH /admin/suggestions/:id`. Si backend aun no implementa esos endpoints, Admin mostrara error de carga o actualizacion.
- La forma exacta del payload admin se normaliza de manera flexible, pero puede requerir ajuste si backend devuelve una estructura distinta.
- No se modifico report generation.
