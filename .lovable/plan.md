## Goal

Create a **monitoring-only account** for your daughter Khadija (born 3/25/2019) so she can see what Daddy is building for her — and nothing else. You stay in full control of what she sees.

---

## What Khadija will see (her view: "For Khadija 💛")

A soft, child-friendly page with:
- A big "Daddy is building this for you" header + the Hall seal
- Cards for **properties you mark visible to her** (nickname, city/state, a photo, a short note — no dollar amounts, no addresses, no payments, no legal docs)
- Her name as Sole Trust Beneficiary (no grantor financial details)
- **Love Notes from Daddy** — short messages you write to her
- Last updated timestamp so she sees "Daddy added something new"

She can **only view**. No edit, no delete, no upload, no invite, no vault, no legacy docs, no board, no payments, no totals, no admin.

## What she will NEVER see (hard-blocked by database RLS)

- Vault / cabinet / passwords / serial numbers
- Legacy private PDFs, letter of intent, trust grantor financial details
- Any property unless you flip its "Show to Khadija" toggle ON (default OFF)
- Payments, purchase price, monthly payment, total owed, interest rate, payoff
- Other members, board, invites, admin pages
- Anything from other users

This protects against the "mom looking over her shoulder" custody concern: even if every property is toggled on, the heir view shows zero financial, legal, or personal-conduct data.

## What you (Owner) get

- A **"Show to Khadija"** toggle on each property page (default OFF)
- A **"Love Notes"** section to write her short messages
- A "Provision Khadija's Account" button on your dashboard that creates her login

---

## Technical Plan

### Database migration
- Add `'heir'` to `app_role` enum; update `can_grant_role` so only owner can grant
- New table `heir_relationships(guardian_id, heir_id)` + `is_heir_of()` helper
- `properties.visible_to_heir boolean default false`
- `beneficiaries.visible_to_heir boolean default true`
- New table `heir_messages(guardian_id, heir_id, title, body)`
- RLS: heir can SELECT only `visible_to_heir=true` rows belonging to their guardian; admin role escalation blocked
- Storage policy: heir can read `property-photos` only for visible properties

### Provisioning
- Server function `provisionHeir` (owner-only): creates invite row, calls `supabaseAdmin.auth.admin.createUser` with the email/password you gave (`khadijahall0325x@gmail.com` / `become the cup`, email auto-confirmed), inserts `heir_relationship`
- One-click button on your dashboard

### UI
- New route `/for-khadija` (heir layout, no header nav, soft pastel theme, seal centered)
- `/properties/$id` → add "Show to Khadija" switch (owner-only)
- `/legacy` → "Love Notes" composer card (owner-only)
- `AppHeader` → for heir role, show only "For Khadija" link + sign out

### Files
- Migration: `supabase/migrations/<timestamp>_heir_role.sql`
- `src/lib/heir.functions.ts` (provision, list visible items, send love note)
- `src/routes/for-khadija.tsx` (heir landing) + redirect heir away from `/dashboard`, `/vault`, `/legacy`, `/board`, `/properties/*`
- `src/components/HeirVisibilityToggle.tsx`
- `src/components/LoveNotesComposer.tsx`
- Edits: `useRole.ts` (add `isHeir`), `AppHeader.tsx`, `_authenticated.tsx` (heir route guard), property detail page

---

**One confirmation before I build:** I'd recommend Khadija's view shows **city + state only** (e.g., "a home in Mobile, AL") with no street address. OK? Reply "go" and I'll ship it.
