## Pre-Deploy Feature Checklist (Granular)

Use this as a living checklist. Check off items as you validate them end-to-end (UI, API, DB, permissions, logs).

### Global

- [ ] Environment files present and correct (`.env.local`, `.env.staging`, `.env.production` for web; `.env` for API)
- [ ] API base URL configured via env (`NEXT_PUBLIC_API_URL`) and reachable
- [ ] Database credentials loaded from env (no hardcoded creds in `app/api/db_connect.php`)
- [ ] Activity logging enabled and writing entries for key actions
- [ ] Error display disabled in production; errors logged server-side only

---

### Admin Portal (Core)

- [ ] Admin authentication and session persistence
- [ ] Role enforcement (admin-only routes and actions)

Entities CRUD coverage (tick for each entity once fully validated end-to-end):

- Users
  - [ ] Create (server validation, duplicate checks)
  - [ ] Read/List (pagination, search, filters)
  - [ ] Update (partial updates, status toggles)
  - [ ] Delete/Deactivate (with safety checks)
  - [ ] Permissions enforced on all endpoints
  - [ ] Audit/activity log entries written
- Events
  - [ ] Create (wizard completes; payload matches API; server rules pass)
  - [ ] Read/List (pagination, search by client/date/status)
  - [ ] Update (details, schedule, capacity, assignments)
  - [ ] Delete/Cancel (with side-effects handled)
  - [ ] Conflict detection (date/time/venue) enforced
  - [ ] Audit/activity log entries written
- Packages
  - [ ] Create (pricing, inclusions)
  - [ ] Read/List (filter by type/status)
  - [ ] Update (components, price revisions)
  - [ ] Delete (with dependency checks)
  - [ ] Audit/activity log entries written
- Venues
  - [ ] Create (capacity, rates, active status)
  - [ ] Read/List (search, availability)
  - [ ] Update (price history tracked)
  - [ ] Delete/Archive (prevent dangling refs)
- Components (non-venue)
  - [ ] Create (type, supplier, pricing)
  - [ ] Read/List (filters)
  - [ ] Update (fees, availability)
  - [ ] Delete (usage checks)
- Suppliers/Organizer Assignments
  - [ ] Invite/Assign (status transitions)
  - [ ] Update assignment status (accept/reject/confirm)
  - [ ] Remove assignment
  - [ ] Notifications triggered on changes
- Reports
  - [ ] Summary reports render and export
  - [ ] Filters work; totals match DB

UI/UX quality for Admin

- [ ] All forms: client-side validation + server error handling
- [ ] Loading, empty, and error states present
- [ ] Success feedback (toasts), no blocking console errors
- [ ] Large lists: pagination or virtualization

---

### Client Portal

- [ ] Signup/Login + OTP flow stable
- [ ] Access control (client-only routes)
- [ ] Booking creation wizard
  - [ ] Step-by-step navigation works
  - [ ] Venue selection behaves as expected
  - [ ] Inclusions step persists data correctly
  - [ ] Price computation matches server
  - [ ] Wizard can resume from drafts (if supported)
- [ ] Documents & downloads accessible as intended
- [ ] Notifications appear (email/SMS/in-app as applicable)

---

### Organizer Portal

- [ ] Organizer authentication and role checks
- [ ] Event invitations list and detail
- [ ] Accept/Reject flows (state updates, comments)
- [ ] Assignment updates reflected in Admin and Client views
- [ ] Notifications triggered on decisions

---

### Notifications

- [ ] Templates exist for key events (invite, accept/reject, booking updates)
- [ ] Delivery transport configured (SMTP/API)
- [ ] Failed deliveries logged with reason
- [ ] Idempotency (no duplicate notifications on retries)

---

### Payments (if in scope)

- [ ] Down payment and balances tracked
- [ ] Reference numbers validated (unique, format)
- [ ] Payment status updates cascade to event/package
- [ ] Reports reflect payment states

---

### API (PHP, Endpoints & Contracts)

- [ ] Endpoint coverage aligns with UI features (Admin, Client, Organizer)
- [ ] JSON request/response contracts documented (status, message, data)
- [ ] Input validation and sanitization for all writes
- [ ] Proper HTTP methods and status codes used
- [ ] Authentication middleware/guards applied consistently
- [ ] Authorization checks for role and ownership
- [ ] Database migrations applied and schema consistent with code
- [ ] Error handling returns safe messages (no sensitive info)
- [ ] Activity logging called for critical changes

---

### Performance & Security

- [ ] Console statements stripped in production (Next compiler removeConsole)
- [ ] Rate limiting on auth/OTP endpoints
- [ ] CAPTCHA applied where appropriate (public forms)
- [ ] CORS configured to expected domains
- [ ] Content Security Policy set (in `next.config.js` headers)
- [ ] No secrets in repo; `.env.example` provided

---

## Lint / Type / Build Sweep

Web (Next.js)

- [ ] ESLint runs clean (or only intentional warnings)
- [ ] TypeScript type-check passes (`tsc --noEmit`)
- [ ] Prettier formatting applied
- [ ] Production build succeeds (`npm run build`)
- [ ] Lighthouse pass on key pages (≥ 80 performance, accessibility reasonable)

API (PHP)

- [ ] Syntax checks pass (e.g., `php -l` on modified files)
- [ ] Basic endpoint smoke tests pass (existing `app/api/test_*.php`)
- [ ] Error display off; logs collected and rotated

---

## Final Demo Readiness

- [ ] Demo script written (Admin → Client → Organizer)
- [ ] Seed demo users and events (credentials documented)
- [ ] One-click data reset or clear instructions
- [ ] Full dry run completed without blockers
