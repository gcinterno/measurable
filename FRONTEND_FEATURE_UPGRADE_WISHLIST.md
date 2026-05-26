# FRONTEND FEATURE UPGRADE WISHLIST

## Mini-auditoría

Source of truth reutilizado antes de implementar:

- Navegación desktop/mobile:
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/MobileBottomNav.tsx`
  - `src/components/layout/AppShell.tsx`
- Manejo oficial de errores API:
  - `src/lib/api.ts`
- Flujo oficial de generación:
  - `src/lib/api/reports.ts`
  - `src/app/reports/new/flow/review/page.tsx`
  - `src/app/integrations/meta/page.tsx`
- Admin:
  - `src/lib/api/admin.ts`
  - `src/app/admin/page.tsx`
- Patrón de formulario reutilizable:
  - `src/components/suggestions/UserSuggestionModal.tsx`
  - `src/lib/api/suggestions.ts`

Hallazgos:

- El sidebar ya tenía un CTA de upgrade desactivado por flags. Se reutilizó el área oficial del menú, sin alterar la estructura desktop/mobile.
- `MobileBottomNav` ya renderiza el mismo `Sidebar` dentro del drawer mobile, así que el botón Upgrade queda consistente sin duplicar lógica.
- `ApiError` y `apiFetch()` ya eran la capa oficial para exponer `code` y `message`. Se extendieron para propagar `upgrade_url`.
- Admin ya tenía infraestructura para tablas/listados de feedback (`suggestions`), por lo que wishlist se integró con el mismo patrón.
- Ya existía un flujo de sugerencias, pero no uno de wishlist. No se reutilizó `createSuggestion()` para no mezclar contratos distintos.

## Rutas creadas

- `/wishlist`

## Componentes modificados

- `src/components/layout/Sidebar.tsx`
  - Se agregó botón `Upgrade` arriba de `Logout`.
  - Se mantuvo el sidebar como source of truth para desktop y mobile.

- `src/app/reports/new/flow/review/page.tsx`
  - Se intercepta `FREE_REPORT_LIMIT_REACHED`.
  - Se muestra modal premium y se redirige al `upgrade_url`.

- `src/app/integrations/meta/page.tsx`
  - Se intercepta `FREE_REPORT_LIMIT_REACHED` en la generación desde Meta.
  - Se muestra el mismo modal premium.

- `src/app/admin/page.tsx`
  - Se agregó sección `Sugerencias / Wishlist`.
  - Se integró a la página admin existente sin romper las secciones actuales.

## Componentes / archivos nuevos

- `src/app/wishlist/page.tsx`
  - Página de upgrade con formulario real.

- `src/components/layout/UpgradeLimitModal.tsx`
  - Modal compartido para el límite free.

- `src/lib/api/wishlist.ts`
  - Cliente API para `POST /wishlist`.

## API clients agregados

- `createWishlistLead(payload)`
  - Archivo: `src/lib/api/wishlist.ts`
  - Usa `apiFetch`, sin duplicar base URL ni manejo de auth.

- `getAdminWishlistLeads()`
  - Archivo: `src/lib/api/admin.ts`
  - Usa `apiFetch`, con normalización de payload flexible.

## Cómo se maneja `FREE_REPORT_LIMIT_REACHED`

Se extendió `ApiError` en `src/lib/api.ts` para transportar:

- `code`
- `message`
- `upgradeUrl`

Comportamiento:

- Si backend devuelve `code = "FREE_REPORT_LIMIT_REACHED"`, frontend no muestra error técnico ni 500.
- Se abre un modal premium con:
  - Título: `Límite gratuito alcanzado`
  - Mensaje: `Has alcanzado el límite de 10 reportes gratuitos.`
  - CTA: `Upgrade Plan`
- El botón `Upgrade Plan` redirige a:
  - `upgrade_url` del backend si existe
  - fallback: `https://measurableapp.com/wishlist`

Pantallas cubiertas:

- `reports/new/flow/review`
- `integrations/meta`

## Cómo se muestra Wishlist en Admin

Se agregó una nueva sección debajo de `Sugerencias de usuarios`:

- Título: `Sugerencias / Wishlist`
- Fuente: `GET /admin/wishlist`
- Orden: newest first

Campos renderizados:

- nombre
- email
- empresa
- mensaje
- source
- fecha
- user/workspace si backend lo incluye

Empty state:

- `Aún no hay registros en wishlist.`

## Validación de UI

Implementado:

1. Sidebar muestra botón Upgrade arriba de Logout.
2. El botón Upgrade lleva a `/wishlist`.
3. `/wishlist` carga dentro del app shell.
4. El formulario hace `POST /wishlist`.
5. Admin consume `GET /admin/wishlist`.
6. El límite free abre modal premium.
7. `Upgrade Plan` redirige correctamente.
8. Mobile sidebar sigue funcionando porque reutiliza `Sidebar`.

No validado manualmente dentro del navegador:

9. Verificación visual final de mobile/sidebar y consola en runtime real.

## Build / lint ejecutados

### `npm run build`

Resultado: exitoso.

Observación:

- Next completó el build y generó la ruta `/wishlist`.
- El build indica `Skipping validation of types`, así que no sustituye un `tsc` estricto.

### `npm run lint`

Resultado: falla por errores preexistentes ajenos a esta tarea.

Errores reportados:

- `src/components/dashboard/ReportPreviewThumbnail.tsx`
  - `react-hooks/set-state-in-effect`
- `src/components/integrations/AdAccountSelector.tsx`
  - `react-hooks/set-state-in-effect`

Warnings preexistentes permanecen en varios archivos no relacionados.

## Riesgos pendientes

- No se hizo validación manual end-to-end contra backend real para confirmar el shape exacto de `GET /admin/wishlist`; la normalización ya contempla variantes comunes.
- El modal de límite free quedó conectado a los dos flujos oficiales detectados, pero si aparece otro camino de generación adicional en el futuro habrá que conectarlo también.
- `/wishlist` actualmente vive dentro del app shell autenticado. Si se necesita también como landing pública externa, eso sería una decisión de routing aparte.
- `lint` sigue bloqueado por deuda previa del repo no relacionada con este feature.

## Resumen de reutilización

Se reutilizó lógica existente en lugar de crear un sistema paralelo:

- `Sidebar` siguió siendo la fuente oficial para navegación desktop/mobile.
- `apiFetch` y `ApiError` siguieron siendo la capa oficial de errores y auth.
- `admin.ts` siguió siendo el cliente oficial para panel admin.
- El patrón de formulario y feedback visual se tomó del flujo existente de sugerencias.
