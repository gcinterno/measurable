## Frontend Optimize Meta Pages Loading

### Qué loading se cambió

- El paso de sync ya no bloquea toda la card mientras espera páginas/cuentas de Meta.
- Se mantiene un loading corto con progreso, pero si tarda más de ~2.3s la UI muestra un estado usable en vez de quedarse pegada en `90%`.
- `Continue` sigue dependiendo de selección + sync correcto, no de un refresh live global.

### Cómo se usan datos cacheados

- El source of truth sigue siendo:
  - `GET /integrations/meta/pages`
  - `GET /integrations/meta/instagram-accounts`
- En frontend ahora se guarda un cache local ligero por source en `localStorage` para warm-start visual.
- Si existe cache local:
  - el selector muestra opciones inmediatamente
  - se enseña `Tus páginas guardadas están listas`
  - se muestra `Última actualización: ...`

### Cómo funciona refresh bajo demanda

- Se agregó wrapper frontend para `POST /integrations/meta/refresh-pages` dentro del API client existente.
- Cada source tiene botón `Refresh pages`.
- Al refrescar:
  - solo esa card entra en estado de refresh
  - luego se vuelve a llamar al GET cacheado
  - si falla, la UI conserva páginas guardadas y muestra:
    `Usaremos las páginas guardadas. Puedes intentar actualizar de nuevo.`

### Cómo se evita loading infinito

- Ya no se deja la card completa en bloqueo largo.
- Si el request tarda:
  - aparece mensaje explicando que puede tardar con muchas cuentas conectadas
  - se muestra `Intentar de nuevo`
- Si no hay cache ni resultados:
  - se muestra `Load pages from Meta`
  - no se deja spinner indefinido

### Search en selector

- Se reutilizó `AdAccountSelector` como source of truth del selector.
- Se añadió búsqueda local:
  - placeholder `Buscar página...`
  - filtro por nombre
  - mensaje vacío si no hay coincidencias

### Archivos cambiados

- `src/app/reports/new/flow/sync/page.tsx`
- `src/components/integrations/AdAccountSelector.tsx`
- `src/lib/api/integrations.ts`

### Lógica reutilizada

- Se reutilizó el flujo existente de sync page.
- Se reutilizó `AdAccountSelector` en lugar de crear otro selector.
- Se reutilizó el API client actual de integraciones Meta.

### Validación ejecutada

- `npx eslint src/app/reports/new/flow/sync/page.tsx src/components/integrations/AdAccountSelector.tsx src/lib/api/integrations.ts`
- `npm run build`

### Riesgos pendientes

- `POST /integrations/meta/refresh-pages` debe existir y aceptar `workspace_id` + `integration_id`.
- El texto `Última actualización` usa timestamp local del último fetch exitoso en frontend; no viene aún desde backend.
