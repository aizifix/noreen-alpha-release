## Capstone Finalization Checklist (9 Days)

- **Day 1: Scope lock & environments**

  - Confirm final feature scope, roles, and demo script
  - Create/verify `.env.local`, `.env.staging`, `.env.production` as per `app/config/README.md`
  - Sanity check `NEXT_PUBLIC_API_URL` points to correct API per env

- **Day 2: Data model & migrations**

  - Run all SQL migrations in `app/api/migrations` on dev DB
  - Verify `app/api/db_connect.php` connects successfully and credentials are NOT used in production
  - Seed minimal demo data (users, events, bookings) for the walkthrough

- **Day 3: Critical flows QA (Admin)**

  - Admin login, create event/package, assign suppliers/components
  - Verify reports and activity logging endpoints work
  - Validate notifications endpoints per `app/api/notifications.php`

- **Day 4: Critical flows QA (Client)**

  - Client signup/login, OTP, create booking wizard end-to-end
  - Validate inclusions workflow in `app/(authenticated)/client/bookings/create-booking`
  - Document any blockers and fixes

- **Day 5: Security & resilience**

  - Remove hardcoded DB creds; switch to env variables
  - Add basic request validation, rate limiting for auth/OTP endpoints
  - Ensure errors are not displayed; enable logging only

- **Day 6: UI polish & accessibility**

  - Fix obvious UI glitches, empty states, loading states, toasts
  - Ensure responsive views and keyboard navigation on forms

- **Day 7: Performance & smoke tests**

  - Add vitest smoke tests for key utilities and pages
  - Lighthouse pass for main flows, optimize large images/libraries

- **Day 8: Release packaging**

  - Update root `README.md` with run instructions (web + API)
  - Prepare deploy notes: env vars, DB migrations, admin seed
  - Optional: simple deployment script (Windows/PowerShell)

- **Day 9: Dry run & demo**
  - Full end-to-end dry run following demo script
  - Fix last-mile issues; tag release and back up DB

---

## What’s Missing / Suggested Actions

- **Sensitive config in code**

  - `app/api/db_connect.php` contains hardcoded credentials. Suggest: read from env (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`) and commit `.env.example` only.

- **Production env setup**

  - Provide `.env.example` for both Next.js and PHP API; document `NEXT_PUBLIC_API_URL` mapping and CORS requirements.

- **Tests**

  - Add minimal vitest suite for client utilities/pages. For API, add simple PHP endpoint smoke scripts (existing `app/api/test_*.php` can be curated).

- **Error monitoring**

  - Consider adding basic server-side logging aggregation or a lightweight error monitor (e.g., log file + rotation). Ensure `display_errors=0` in production.

- **Rate limiting & abuse protection**

  - Implement basic rate limiting on OTP and auth endpoints; add CAPTCHA where exposed.

- **Auth hardening**

  - Ensure OTP flows finalized, 2FA library (`robthree/twofactorauth`) integrated where intended. Enforce password change flags and account status checks.

- **CI/CD**

  - No workflows found. Suggest: add a minimal GitHub Actions workflow to lint/build the Next.js app on PR.

- **Docs**

  - Root `README.md` is default. Expand with: prerequisites, setup, env vars, running API + web, migrations, demo users.

- **Deployment**
  - Provide a one-page deploy guide (PowerShell): install PHP extensions, import migrations, set Apache/Nginx or Node start, env files placement.

---

## Quick Task List

- Create `.env.local`, `.env.staging`, `.env.production` (web) and `.env` (API)
- Replace DB credentials in `app/api/db_connect.php` with env reads
- Run and verify all `app/api/migrations/*.sql`
- Seed demo data for admin/client flows
- Add basic vitest tests and configure `npm run test`
- Update `README.md` with full setup + demo instructions
- Add GitHub Actions workflow for lint/build
- Prepare deploy notes and run a complete dry run
