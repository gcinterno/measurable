# Meta Tracking

## Variables

Set these variables in Vercel and Railway:

- `NEXT_PUBLIC_META_PIXEL_ID`
- `NEXT_PUBLIC_META_PIXEL_ENABLED=true`
- `NEXT_PUBLIC_META_PIXEL_DEBUG=true` for local/debug only

## Implemented events

- `PageView`
- `Lead`
- `CompleteRegistration`
- `Login`
- `MetaConnectStarted`
- `MetaConnected`
- `ReportCreated`
- `ExportPDF`
- `ExportPPTX`
- `UpgradeClicked`

## Deduplication

Frontend generates one `event_id` per tracked event with `crypto.randomUUID()`.

The same `event_id` is sent to:

- Meta Pixel in the browser via `fbq("track", eventName, params, { eventID })`
- Backend via `POST /tracking/meta/event`

This allows Meta Events Manager to deduplicate the browser event and the Conversions API event.

## Browser identifiers

Frontend sends:

- `_fbp` cookie when available
- `_fbc` cookie when available
- if `_fbc` is missing and `fbclid` exists in the URL, frontend builds:
  - `fb.1.{timestamp}.{fbclid}`

## Test events

1. Open Meta Events Manager.
2. Go to `Test Events`.
3. Open the site with:
   - `NEXT_PUBLIC_META_PIXEL_ENABLED=true`
   - `NEXT_PUBLIC_META_PIXEL_DEBUG=true`
4. Trigger the implemented actions:
   - page navigation
   - pricing CTA clicks
   - login
   - registration + email verification
   - Meta connect
   - report creation
   - PDF/PPTX export
5. Verify the events arrive in Test Events.

## Validate deduplication

1. Trigger one tracked action.
2. In Meta Events Manager, confirm the Pixel event and the server event share the same `event_id`.
3. Confirm the event is marked as deduplicated instead of double-counted.

## Notes

- Tracking is skipped for localhost unless `NEXT_PUBLIC_META_PIXEL_DEBUG=true`.
- Tracking is skipped for admin users when the frontend store identifies them as admin.
- The Meta callback route page view is intentionally skipped to avoid noisy technical tracking.
