# FRONTEND FIX META DISCONNECT

## Archivos modificados

- `src/app/integrations/page.tsx`
- `src/app/reports/new/flow/page.tsx`
- `src/app/reports/new/flow/sync/page.tsx`
- `src/components/integrations/IntegrationCard.tsx`
- `src/components/reports/IntegrationLibrary.tsx`
- `src/lib/api/integrations.ts`
- `src/lib/integrations/session.ts`

## Como se llama disconnect

- Se agrego `disconnectMetaIntegration()` en `src/lib/api/integrations.ts`.
- Hace `POST /integrations/meta/disconnect`.
- Envia `workspace_id` en el body JSON.
- Se usa desde:
  - `src/app/integrations/page.tsx`
  - `src/components/reports/IntegrationLibrary.tsx`

## Confirmacion y UX

- Antes de desconectar, se muestra:
  - `¿Quieres desconectar Meta? Esto desconectará Facebook Pages e Instagram Business de este workspace. Tus reportes existentes no se eliminarán.`
- Durante disconnect:
  - se deshabilitan botones
  - se muestra loading en el boton secundario
- En success:
  - mensaje: `Integración desconectada correctamente.`
- En error:
  - mensaje amigable sin dejar loading infinito

## Estado local que se limpia

Se centralizo en `clearMetaIntegrationSessionState()` dentro de `src/lib/integrations/session.ts`.

Limpia:

- `pendingMetaSource`
- `measurable.meta.sync.selectorCache`
- `integrationId`
- `datasetId`
- `businessId`
- `adAccountId`
- `pageId`
- `pageName`
- `synced`
- `postConnectRedirect`
- `selectedSources`
- `selectedAccountsBySource`
- `source`
- `integration`

No toca storage de otros modulos.

## Como se invalida cache

- No hay SWR ni React Query en este flujo.
- El cache local detectado era `localStorage`:
  - `integrationReportContext`
  - `pendingMetaSource`
  - `measurable.meta.sync.selectorCache`
- Despues de disconnect:
  - se remueve `pendingMetaSource`
  - se remueve `measurable.meta.sync.selectorCache`
  - se resetea `integrationReportContext` solo en su parte Meta

## Como se actualiza Integrations

- La pagina `src/app/integrations/page.tsx` ya no marca Connected por paginas cacheadas o contexto local.
- `Connected` depende de `fetchIntegrationsConnectionStatus()` y por lo tanto del backend.
- Si el backend responde disconnected:
  - ambas cards Meta vuelven a `Connect`
  - desaparece el badge `Connected`

## Como se actualiza New Report

- `src/app/reports/new/flow/page.tsx` deja de pasar un `connectedIntegrationKey` derivado de localStorage.
- `src/components/reports/IntegrationLibrary.tsx` ahora:
  - consulta backend para resolver el estado Meta
  - limpia session local si backend devuelve disconnected
  - usa el mismo endpoint real para `Disconnect`
- `src/app/reports/new/flow/sync/page.tsx` ahora:
  - valida `fetchIntegrationsConnectionStatus()` antes de cargar paginas/cuentas
  - no reutiliza paginas/cuentas viejas si backend responde disconnected
  - limpia seleccion previa y cache local
  - bloquea la continuacion al estado de sync
  - muestra:
    - `Conecta Meta para cargar tus páginas y crear reportes.`
    - boton `Connect Meta`

## Build y lint ejecutados

- `npm run lint -- src/app/integrations/page.tsx src/components/reports/IntegrationLibrary.tsx src/app/reports/new/flow/page.tsx src/app/reports/new/flow/sync/page.tsx src/components/integrations/IntegrationCard.tsx src/lib/api/integrations.ts src/lib/integrations/session.ts`
  - resultado: OK
- `npm run build`
  - resultado: fallo por un error de parseo preexistente en `src/lib/i18n/messages.ts:350`
  - ese error esta fuera de este fix

## Riesgos pendientes

- No valide visualmente en navegador el flujo completo end-to-end con Meta real conectado/desconectado.
- `npm run build` sigue bloqueado por un archivo no relacionado (`src/lib/i18n/messages.ts`), asi que no hay verificacion de build completo hasta corregir ese parse error.
- La pagina profunda `src/app/integrations/meta/page.tsx` no fue extendida con un boton nuevo de disconnect; el fix cubre `Integrations` y el flujo embebido de `New Report`, que son donde hoy existe el disconnect relevante.
