# FRONTEND_FIX_META_OAUTH_FIRST_LOGIN

## Source of truth found

- `src/lib/integrations/meta-oauth.ts`
  Central Meta OAuth client state: pending session storage keys, popup open helper, callback message shape, same-tab retry behavior.
- `src/app/integrations/page.tsx`
  Official integrations cards flow for Facebook Pages and Instagram Business connect/disconnect state.
- `src/app/integrations/meta/page.tsx`
  Official Meta detail flow for page loading after connection and same-tab callback landing.
- `src/app/integrations/meta/callback/page.tsx`
  Frontend callback handler that validates backend result, posts `postMessage` to the opener, and redirects when popup fallback is not used.

## Files changed

- `src/lib/integrations/meta-oauth.ts`
- `src/app/integrations/page.tsx`
- `src/app/integrations/meta/page.tsx`
- `src/app/integrations/meta/callback/page.tsx`

## What was reused

- Reused existing `connectMetaIntegration`, `fetchIntegrationsConnectionStatus`, `fetchMetaPages`, `openMetaOAuthPopup`, `isMetaOAuthWindowMessage`, and callback `postMessage` flow.
- Did not create a new OAuth flow, endpoint, route, or backend URL.
- Left duplicated report-flow popup logic in `src/components/reports/IntegrationLibrary.tsx` untouched for this task; the integrations pages remain the operational source of truth for this fix.

## How to test in incognito

1. Open an incognito window and sign in to Measurable.
2. Go to `/integrations`.
3. Test already logged into Facebook:
   - Log into Facebook in the same incognito profile first.
   - Click `Connect` on Facebook Pages or Instagram Business.
   - Confirm the popup shows `Connecting...`, completes, closes, and both Meta cards move to `Connected` without a manual refresh.
4. Test not logged into Facebook:
   - Sign out of Facebook in incognito.
   - Click `Connect`.
   - Complete Facebook login and permissions in the same popup.
   - Confirm no premature “window closed” error appears during the Facebook login screen.
   - Confirm Measurable refreshes automatically after the callback and shows `Connected`.
5. Test popup closed before authorization:
   - Click `Connect`.
   - Close the popup before approving permissions.
   - Confirm the UI shows:
     `The connection window was closed before authorization was completed. Please try again.`
6. Test popup blocked / same-tab fallback:
   - Block popups for the site.
   - Click `Connect`.
   - Confirm the current tab redirects to Meta OAuth.
   - Finish or cancel the flow and verify the callback returns you to the integrations area cleanly.

## Tests/build run

- `npm run build`
- `npx eslint src/lib/integrations/meta-oauth.ts src/app/integrations/page.tsx src/app/integrations/meta/page.tsx src/app/integrations/meta/callback/page.tsx`

## Remaining risks

- `src/components/reports/IntegrationLibrary.tsx` still contains similar popup lifecycle logic; it was intentionally not changed to avoid touching report flow outside scope.
- Same-tab callback UX still depends on which integrations page initiated the flow and on backend callback query parameters being present and stable.
- If the backend reports a connected integration before authorized pages are readable, the UI can still land in the existing “connected but no authorized pages” state until Meta page data is available.
