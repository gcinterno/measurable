# Frontend Fix Meta OAuth Popup Close

## Objetivo

Mejorar el cierre automático del popup de Meta sin cambiar el flujo OAuth actual ni los endpoints backend.

## Ajustes aplicados

- El callback ` /integrations/meta/callback ` ahora:
  - valida el resultado del callback
  - envía `postMessage` tipado al `window.opener`
  - intenta `window.close()` después de completar la conexión
  - si no logra cerrarse, muestra una pantalla limpia de Measurable con:
    - estado de éxito o error
    - CTA `Cerrar pestaña`
    - CTA `Volver a Measurable`

- La página principal de `Integrations` mantiene:
  - listener con validación estricta de `event.origin`
  - refetch del estado de integración al recibir éxito
  - mensaje amistoso al recibir error

- Se mantuvo el fallback por polling:
  - si el popup se cierra, el estado se refresca
  - si el popup se queda fuera de nuestra URL por demasiado tiempo, el loading se limpia a los 90 segundos y se muestra:
    - `Si terminaste la conexión, ya puedes cerrar la pestaña de Meta.`

## Áreas cubiertas

- `/integrations`
- `/integrations/meta`
- `/integrations/meta/callback`
- `IntegrationLibrary` embebido en el flujo de reportes

## Contrato preservado

- `connectMetaIntegration(...)`
- `createPendingMetaOAuth(...)`
- callback `/integrations/meta/callback`
- `fetchIntegrationsConnectionStatus()`
- `fetchMetaPages(...)`

No se abrió un flujo OAuth paralelo.
