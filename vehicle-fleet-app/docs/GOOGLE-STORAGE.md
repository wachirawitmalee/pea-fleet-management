# Smart Fleet Care: Google storage

The Next.js server calls a secret-protected Apps Script web app. Nine Google Sheets tabs replace the Prisma tables; Drive holds images. Keep the spreadsheet and image folder restricted. Never expose `GOOGLE_STORAGE_SECRET` as a `NEXT_PUBLIC_` variable or commit `.env`/`backups`.

## Configuration

See `.env.example`. Production uses `DATA_BACKEND=google-sheets`, `PHOTO_BACKEND=google-drive`, `GOOGLE_APPS_SCRIPT_URL` and `GOOGLE_STORAGE_SECRET`. `NEXT_PUBLIC_APP_URL=https://pea-fleet-management.vercel.app` is the public origin printed in QR labels. PostgreSQL remains available with `DATA_BACKEND=postgres` until cutover.

Apps Script properties: `SPREADSHEET_ID`, `IMAGE_FOLDER_ID`, and `STORAGE_SECRET` (same secret as the server). Enable the advanced Google Sheets service. Run `npm run google:bundle`, copy Schema.gs and Code.gs into the bound script, run `setupSheets` once, and deploy a Web app executing as the owner. Requests may reach the endpoint without Google sign-in, but `doPost` checks the secret before every operation. Updating code requires updating the deployment version.

## Migration and verification

1. Save the Google configuration on the hosting provider. Set `FLEET_READ_ONLY=true` and deploy this app version while still using PostgreSQL. Confirm mutations return 503. Pause direct database writers too.
2. Run `npm run migrate:google` to validate and back up a consistent source snapshot. Backups contain private business data; store securely.
3. Run `npm run migrate:google -- --apply`. The destination must be empty. Images are copied to Drive with content-based deduplication, preserving source data. All nine tables are committed atomically and every scalar field is read back and compared.
4. Set `DATA_BACKEND=google-sheets`, set `FLEET_READ_ONLY=false`, redeploy, and verify dashboard, reservations, vehicle QR links, photos and forms.
5. Retain the original database and backup. Once new writes exist in Sheets, switching back to PostgreSQL requires reconciling those writes first; an old deployment alone is not a safe data rollback.

On an uncertain timeout, inspect the destination before retrying. The migration refuses nonempty destinations rather than overwriting them. Do not edit sheet headers or rows directly while app writes are enabled. Concurrent app mutations use a lock and version check; Sheets edits made outside the app bypass that protocol.

## QR labels

In Admin > Vehicles, print a new QR for each vehicle. New labels encode `/vehicle/{vehicleId}` and open the matching receive/return page from the phone camera. The stable ID survives plate/name edits. Existing text-only labels continue to work with the in-app scanner, but must be reprinted for native phone-camera links. Keep the public domain stable.

## Performance and analytics

Server reads share a 10-second snapshot cache. Writes use fresh snapshots and atomic changed-table commits. The receive/return page requests only one vehicle's active queue; dashboard queries omit photo payloads. Uploaded images are resized before transfer.

Dashboard metrics include monthly fuel amount/liters, weighted price per liter, completed-trip distance, repair costs, six-month trends and per-vehicle comparisons. Fuel cost/km is an estimate based on the month's recorded expenses and trips, not measured fuel efficiency. Repair costs use request month. Invalid trip mileages are excluded and counted. Empty denominators show no value rather than zero.

Google Sheets/Apps Script has quotas and latency; it is suitable for this small fleet, not an unlimited database. The migration does not add a new end-user authentication system to the existing app.

## Checks

`npm test`, `npm run typecheck`, `npm run build`. The build fetches the configured Google font and needs network access.
