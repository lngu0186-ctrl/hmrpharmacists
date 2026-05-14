# HMR Pharmacist Exchange

Production marketplace at **[hmrpharmacists.com.au](https://hmrpharmacists.com.au)** — an Australia-wide directory connecting patients, GPs, clinics, and community pharmacies with credentialed pharmacists for Home Medicines Reviews (HMRs).

Built on **TanStack Start** (React 19 + Vite 7) with **Lovable Cloud** (Supabase) for database, auth, storage, and server-side functions. Deployed to Cloudflare Workers via the Lovable platform.

---

## Stack

| Layer | Tech |
|---|---|
| UI | React 19, TanStack Router (file-based), Tailwind v4, shadcn/ui, Lucide |
| Server | TanStack Start server functions (`createServerFn`), server routes (`/api/*`, `/sitemap.xml`) |
| Data | Supabase Postgres, Row-Level Security |
| Auth | Supabase Auth (email/password + Google) |
| Storage | Supabase Storage (`pharmacist-photos` bucket) |
| Email | Resend via Lovable AI Gateway |
| Hosting | Cloudflare Workers (via Lovable publish) |

---

## Local development

```bash
bun install
bun run dev          # http://localhost:5173
bun run build        # production build
bun run lint
bun run format
```

The dev server is wired through `@lovable.dev/vite-tanstack-config`. Do not edit `src/integrations/supabase/client.ts`, `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `types.ts`, or `.env` — they are regenerated automatically.

---

## Environment variables

Two sets — never mix them.

### Browser (`import.meta.env.VITE_*`, safe to bundle)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Server (`process.env.*`, server-only)
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY` — used to authenticate against the Lovable connector gateway
- `RESEND_API_KEY` — managed via Lovable Cloud → Connectors → Resend

All secrets are managed in **Lovable Cloud → Settings → Secrets**.

---

## Deployment

1. Click **Publish** in the Lovable editor (top-right). Frontend changes require a republish; server functions and migrations deploy on save.
2. Custom domains (`hmrpharmacists.com.au`, `www.hmrpharmacists.com.au`) are managed under Project → Settings → Domains.
3. After deployment, smoke-test:
   - `/` loads
   - `/find` returns verified pharmacists
   - `/sitemap.xml` returns absolute URLs
   - Anonymous enquiry submission inserts a row in `enquiries`
   - Admin verification triggers a Resend email and an `email_send_log` row

---

## Architecture

### Routes (`src/routes/`)
- `__root.tsx` — sitewide head, providers, error/notFound boundaries
- `index.tsx` — landing page
- `find.tsx` — directory search (suburb radius, specialty, telehealth filters)
- `pharmacists.$slug.tsx` — public profile + enquiry form
- `_authenticated.tsx` — auth gate (redirects to `/auth`)
- `_authenticated/dashboard.tsx` — pharmacist dashboard
- `_authenticated/profile.tsx` — pharmacist profile editor
- `_authenticated/onboarding.tsx` — first-run pharmacist onboarding
- `_authenticated/admin.tsx` + `admin/index.tsx` + `admin/content.tsx` — admin console (verification queue, content pages, email log)
- `pages.$slug.tsx` — dynamic CMS pages
- `sitemap[.]xml.ts` — server-generated sitemap with absolute URLs

### Server functions (`src/lib/*.functions.ts`)
- `email.functions.ts`
  - `sendEnquiryEmails` — public, idempotent per `enquiry_id`, only fires for enquiries < 10 min old
  - `sendVerificationEmail` — admin-only (`requireSupabaseAuth` + `user_roles` check)
- `geocode.functions.ts` — geocoding for suburb radius search

`createServerFn` is the canonical server layer. **Do not add Supabase Edge Functions** for app-internal logic.

### Auth middleware
- `attachSupabaseAuth` (client middleware, registered globally in `src/start.ts`) attaches the user's bearer token to every server-function RPC.
- `requireSupabaseAuth` (server middleware) validates the token and provides `{ supabase, userId, claims }` in handler context.

---

## Database

### Key tables
- `pharmacists` — profile rows. Public reads via the `Public can view approved pharmacists` policy (verified + published only). Sensitive columns (`ahpra_number`, `credentialing_body`, `contact_preference`) are revoked from `anon` and `authenticated` roles via column-level GRANT. Owner can update everything except `verification_status` / `is_published` (enforced by `guard_pharmacist_admin_fields` trigger).
- `pharmacist_specialties`, `pharmacist_languages`, `pharmacist_service_areas`, `pharmacist_affiliations` — child tables, public-readable for verified+published parents.
- `enquiries` — anonymous insert with `consent_given = true` required. Owner pharmacist can read/update.
- `consent_records` — insert tied to a freshly-created enquiry (RLS check verifies `enquiry_id` exists with `created_at > now() - 5 min`).
- `notifications` — service-role insert only; user reads own.
- `email_send_log` — service-role insert only; admin read.
- `enquiry_audit_events`, `admin_audit_logs` — service-role insert only; admin read.
- `content_pages` — admin-managed, public reads when `is_published`.
- `user_roles` — separate from `profiles` to prevent privilege escalation. Roles checked via `has_role(uid, 'admin')` SECURITY DEFINER function.

### RLS philosophy
- Anonymous: read public (verified+published) directory data, submit consent-checked enquiries.
- Authenticated pharmacist: full CRUD on own profile + child tables; cannot self-verify.
- Admin: full access via `has_role()` checks in policies.
- Service role: bypasses RLS — used inside server functions for trusted writes (notifications, audit, email log).

---

## Storage

Bucket `pharmacist-photos` (public read for direct URLs only):
- INSERT/UPDATE/DELETE restricted to file owner (`storage.foldername(name)[1] = auth.uid()::text`).
- Listing is not exposed by the app.

---

## Security notes

See `mem://security/index.md` (security memory) for the full threat model. Highlights:

1. **AHPRA numbers and credentialing details are never exposed to the API for non-admins** — column-level GRANT REVOKE on `pharmacists`.
2. **Pharmacists cannot self-verify** — DB trigger `guard_pharmacist_admin_fields` blocks `verification_status` and `is_published` changes by non-admins.
3. **`sendVerificationEmail` requires admin role** — checked server-side in the handler.
4. **`sendEnquiryEmails` is idempotent and time-windowed** — replay attacks cannot spam pharmacists.
5. **Markdown renderer validates href schemes** — only `http(s)`, `mailto`, `tel`, anchor, and relative URLs allowed (no `javascript:` / `data:`).
6. **All sensitive system tables (notifications, audit, consent, email log) reject public inserts** — only service role writes them.
7. **`attachSupabaseAuth` is registered globally in `src/start.ts`** — every server-function RPC carries the user's bearer token.

---

## Admin workflows

1. **Verify a pharmacist**: Admin console → Verification queue → Approve/Reject. Trigger sends a Resend email and writes to `email_send_log`.
2. **Edit content pages**: Admin → Content → choose page → edit markdown body → save. Pages render at `/pages/<slug>`.
3. **Monitor email delivery**: Admin → Email log tab. Server-side paginated, filterable by status.
4. **Inspect enquiries**: Admin → Enquiries tab.

---

## Operational notes

- **Email "from" address**: currently `onboarding@resend.dev`. To switch to `noreply@hmrpharmacists.com.au`, verify the domain in Resend, then update the `FROM` constant in `src/lib/email.functions.ts`.
- **Sitemap**: cached for 1 hour at the edge (`Cache-Control: public, max-age=3600, s-maxage=3600`). Pings should expect at most a 1-hour delay after publish.
- **Hero image**: `src/assets/hero.jpg` is ~770 KB. Replace with a WebP/AVIF for a faster LCP.

---

## Production-readiness checklist

| Area | Status | Notes |
|---|---|---|
| RLS on every public table | ✅ | Audited; sensitive cols revoked from anon/authenticated |
| Service-role only for system writes | ✅ | notifications, audit, consent, email_log |
| Pharmacist self-verification blocked | ✅ | DB trigger |
| Admin server-fn auth | ✅ | `sendVerificationEmail` |
| Public server-fn rate/replay protection | ✅ | `sendEnquiryEmails` idempotent + 10-min window |
| Markdown XSS safe | ✅ | href scheme validation |
| Auth middleware wired | ✅ | `attachSupabaseAuth` in `start.ts` |
| Sitemap absolute URLs | ✅ | + dynamic pharmacists |
| `robots.txt` blocks private routes | ✅ | dashboard/admin/auth disallowed |
| Hero image optimised (WebP/AVIF + responsive srcset) | ⚠️ | follow-up: convert hero.jpg |
| Lazy-load Recharts in admin | ⚠️ | follow-up |
| Vitest + RTL setup | ⚠️ | follow-up — see "Testing" below |
| GitHub Actions CI (lint/build) | ⚠️ | follow-up — see "CI" below |
| Lint clean | ⚠️ | config is pragmatic; mostly `any` warnings remain |

---

## Follow-up: Testing

To add Vitest + Testing Library:

```bash
bun add -d vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

Add to `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Suggested coverage:
- `src/lib/markdown.test.ts` — `safeHref` blocks `javascript:`
- `src/lib/email.functions.test.ts` — admin role check rejects non-admin
- Smoke render tests for `/`, `/find`, `/auth`

## Follow-up: CI

`.github/workflows/ci.yml` (run on push + PR):
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run build
      - run: bun run test  # once vitest is added
```

---

## License

Proprietary — © HMR Pharmacist Exchange.
