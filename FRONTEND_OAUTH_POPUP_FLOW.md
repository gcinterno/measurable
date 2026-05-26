# Frontend OAuth Popup Flow

## Source of truth reused

- `src/lib/integrations/meta-oauth.ts`
- `src/app/integrations/meta/callback/page.tsx`
- `src/app/integrations/page.tsx`
- `src/app/integrations/meta/page.tsx`
- `src/components/reports/IntegrationLibrary.tsx`

The existing Meta OAuth contract remains the same:

1. Frontend asks backend for the Meta auth URL with `connectMetaIntegration(...)`.
2. Frontend stores the pending OAuth context with `createPendingMetaOAuth(...)`.
3. Meta redirects back to `/integrations/meta/callback`.
4. Callback verifies the connection with:
   - `fetchIntegrationsConnectionStatus()`
   - `fetchMetaPages(...)`

No parallel OAuth flow or backend contract was introduced.

## Popup behavior

Connect buttons now try to open Meta OAuth with:

```ts
window.open(authUrl, "measurable_meta_oauth", "width=720,height=780");
```

If the popup is blocked, the frontend falls back to:

```ts
window.location.href = authUrl;
```

## Callback -> opener communication

When `/integrations/meta/callback` confirms success or failure, it sends:

- Success: `MEASURABLE_META_CONNECT_SUCCESS`
- Error: `MEASURABLE_META_CONNECT_ERROR`

via `window.opener.postMessage(...)` restricted to `window.location.origin`.

After posting, the callback tries:

```ts
window.close();
```

If the popup cannot close itself, it renders:

`Conexión completada. Puedes cerrar esta pestaña.`

## Parent refresh behavior

The main integration screens listen for the message event and:

- validate `event.origin === window.location.origin`
- clear pending OAuth state
- stop the loading state
- refetch integration status / pages / accounts
- update UI without a manual refresh

## Polling fallback

If `postMessage` does not arrive, the parent watches `popup.closed` every 2.5 seconds.

When the popup closes:

- the interval is cleared
- the integration state is refetched
- loading is removed
- a friendly message is shown if the flow was closed before completion

## Screens covered

- `/integrations`
- `/integrations/meta`
- embedded Meta connect in `IntegrationLibrary`
- `/integrations/meta/callback`
