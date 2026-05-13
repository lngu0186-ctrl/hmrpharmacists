# HMR Pharmacist Exchange — Build Plan

This is a large, production-grade healthcare platform. I'll build it in phases so we can review progress and adjust. Phase 1 ships a polished, working foundation; later phases add depth.

## Phase 1 — Foundation, Landing, Directory (this iteration)

**Design system**
- Healthcare palette: soft whites, slate, calming blue primary, subtle gradients
- Typography: Inter for body, a refined display font for headings
- Tokens in `src/styles.css` (oklch), shadcn variants for trust/verified badges
- Mobile-first, spacious, accessible

**Lovable Cloud (Supabase) setup**
- Enable Cloud
- Schema: `profiles`, `pharmacists`, `pharmacist_service_areas`, `pharmacist_languages`, `pharmacist_specialties`, `pharmacist_affiliations`, `enquiries`, `enquiry_audit_events`, `verification_records`, `consent_records`, `admin_audit_logs`, `content_pages`, `user_roles` (separate, with `has_role` security definer)
- RLS on every table per spec (public reads only approved profiles, pharmacists edit own, admin full, enquiries visible to admin + assigned pharmacist)
- Seed ~12 realistic Victorian pharmacist profiles (metro + regional, varied specialties)

**Routes (TanStack-style separate pages)**
- `/` Landing: hero, HMR explainer, 4 audience cards, trust section, how-it-works, featured pharmacists, FAQ, footer with disclaimers
- `/find` Directory: suburb/postcode search, radius, filters (accepting referrals, telehealth, home visit, languages, specialties), list/map toggle (list first, map placeholder), result cards
- `/pharmacists/:slug` Profile pages
- `/for-patients`, `/for-gps`, `/for-pharmacies`, `/for-pharmacists` segment pages
- `/about-hmr`, `/privacy`, `/terms`, `/contact`
- `/auth` login/signup
- `/sitemap.xml`, `/robots.txt`

**Enquiry system (basic)**
- Privacy-safe form on profile page → inserts into `enquiries` with consent record + audit event
- No clinical detail fields in MVP

**SEO**
- Per-route head() with title/description/og
- JSON-LD Organization on root, Person schema on profiles
- Semantic HTML, alt text

## Phase 2 (next iteration, after review)
- Pharmacist onboarding wizard (multi-step with progress, draft save, evidence upload)
- Pharmacist dashboard (edit profile, accepting-referrals toggle, enquiry inbox)
- Admin dashboard (approval queue, verification states, enquiry management, audit logs, analytics with Recharts)
- Map view with real geocoding
- Admin CMS for content_pages

## Phase 3
- Full-text + geospatial search tuning
- Notifications (email via edge function)
- Advanced analytics, funnels
- Additional segment SEO landing pages (city-specific)

## Compliance baked in throughout
- Disclaimers in footer + contextually on patient-facing pages
- "General information only / not emergency care / eligibility determined by clinicians"
- No reviews, no ratings, no testimonials, no "best" language
- Australian spelling

## Out of scope for Phase 1
- Real AHPRA verification API (manual admin review only)
- Payments
- Real-time chat
- Mobile apps

---

Approving this plan starts Phase 1. After it ships and you've reviewed, I'll proceed to Phase 2.
