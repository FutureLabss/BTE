# PRD — Break The Eyes Media Operational Admin Portal

**Product:** BTE Admin Portal (custom web app, replaces the original Notion spec)
**Prepared for:** Emediong Umoh, Founder & CEO, Break The Eyes Media
**Build tool:** Claude Code
**Stack:** Next.js 14+ (App Router) · Supabase (Postgres, Auth, Storage, RLS) · Tailwind CSS · Vercel
**Version:** 1.0 — 25 July 2026
**Source document:** BTE Admin Portal Developer Brief v1.0 (20 July 2026)

---

## 1. Overview

A single web application from which the founder administers clients, contracts, projects, events, finance, payroll, vendors, and institutional knowledge — with a read-only monitoring layer computed live from operational data.

This PRD supersedes the Notion brief as the build specification. It preserves the brief's intent (five-pillar structure, relational data model, phased delivery, fast data entry, mobile usability) and resolves three defects in the original:

1. **Missing Leads/Pipeline database** — the monitoring layer required a leads tracker that no module defined. A Leads table is now specified in Module 1.
2. **Phase sequencing conflict** — Phase 3 required vendor linkage but vendors were built in Phase 4. Vendors table now ships in Phase 3.
3. **Invoicing limitations** — Notion cannot produce client-facing invoices. This build generates numbered PDF invoices natively.

## 2. Goals and non-goals

**Goals**
- One environment for all company administration; nothing lives in the founder's head or in disconnected spreadsheets.
- Every project, contract, revenue entry, and cost entry attributable to one of five pillars.
- Data entry in ≤ 30 seconds for common actions (log revenue, update project status, add task).
- Monitoring dashboard computed entirely from operational data — zero manual entry in the read layer.
- Usable daily on a mobile browser (founder operates across Abuja and Lagos).

**Non-goals (v1)**
- No client-facing portal or external logins.
- No payment collection integration (Paystack etc.) — payment status is tracked manually. Integration is a v2 candidate.
- No automated tax remittance — WHT is tracked, not filed.
- No native mobile app — responsive web only.
- The portal stores working reference copies of contracts; it is not a substitute for executed legal documents.

## 3. Users and access

| Phase | Users | Access model |
|---|---|---|
| 1–3 | Founder only | Supabase Auth (email + password or magic link), single account |
| 4+ | Founder + team leads | Role-based access (see §8) |

The schema is RBAC-ready from day one (`profiles.role`), but no role UI or permission tiers are built until Phase 4. RLS policies in Phases 1–3 simply restrict all access to authenticated users.

## 4. Company structure (domain constants)

**Pillar enum** — exactly these five values, used as a Postgres enum `pillar`:
`experiences` · `production` · `communications` · `brand_marketing` · `people_culture`

Display labels: Experiences / Production / Communications / Brand & Marketing / People & Culture. No aliases or abbreviations anywhere in the UI.

**Status colour convention** (global, enforced in a shared `<StatusBadge>` component):
- Green — active, signed, paid, on track, complete
- Amber — in progress, pending, sent, at risk, under review
- Red — overdue, delayed, expired, terminated, declined
- Grey — draft, inactive, archived, not started

**Currency:** Nigerian Naira only. Store as `numeric(14,2)`. Display as `₦2,500,000` (₦ symbol, comma thousands, no decimals unless kobo present). A single `formatNaira()` utility is the only permitted formatter.

**Dates:** store as `date`/`timestamptz`; display as `DD Month YYYY` (e.g. 10 September 2026) via a single `formatDate()` utility.

## 5. Data model

All tables include `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at`. Foreign keys are enforced at the database level — the relational structure is non-negotiable. Soft-delete via `archived_at timestamptz` on major tables; no hard deletes from the UI.

### 5.1 Core relational map

```
leads ────────────▶ proposals ─────▶ contracts (on acceptance)
clients ─▶ contracts ─▶ projects ─▶ tasks
clients ─▶ invoices ─▶ invoice_line_items
projects ─▶ revenue_entries
projects ─▶ cost_entries
projects ─▶ project_vendors ◀─ vendors
projects ◀─ events ─▶ run_of_show_items / event_people / event_vendors / attendees
staff ─▶ project_assignments ◀─ projects
staff ─▶ payroll_entries
targets ◀─ (computed against revenue/cost/project data via SQL views)
```

### 5.2 Tables

**clients**
`name`, `client_type` enum(institutional, corporate, individual), `pillar`, `point_of_contact`, `contact_email`, `contact_phone`, `billing_details jsonb`, `status` enum(prospect, active, inactive), `notes`
Derived (views): lifetime value, outstanding balance, last activity.

**leads** *(new — fixes gap in original brief)*
`name`, `organisation`, `client_id fk nullable` (set on conversion), `pillar`, `source`, `stage` enum(new, contacted, proposal_sent, negotiation, won, lost), `estimated_value numeric`, `next_action`, `next_action_date`, `owner_id fk staff`, `lost_reason nullable`
Conversion: marking a lead `won` prompts creation/link of a client record.

**proposals**
`title`, `lead_id fk nullable`, `client_id fk nullable`, `pillar`, `body text` (full scope), `value numeric`, `version int`, `status` enum(draft, sent, accepted, declined, expired), `sent_date`, `decision_date`
On acceptance: prompt to create a contract pre-filled from the proposal.

**contracts**
`client_id fk`, `title`, `pillar`, `contract_type` enum(contract, sow, retainer), `body text` (scope, deliverables, payment terms, termination clauses), `value numeric`, `start_date`, `end_date`, `status` enum(draft, sent, signed, expired, terminated), `file_url` (Supabase Storage — signed copy upload)

**projects**
`name`, `client_id fk nullable` (internal projects allowed), `contract_id fk nullable`, `pillar`, `project_lead_id fk staff`, `start_date`, `deadline`, `status` enum(not_started, in_progress, at_risk, delayed, complete), `budget numeric`, `is_event boolean`, `deliverables jsonb` (checklist: [{label, done}]), `notes`
Derived: spend to date (sum of cost_entries), revenue to date, margin.

**tasks**
`project_id fk`, `title`, `assignee_id fk staff nullable`, `due_date`, `status` enum(not_started, in_progress, blocked, done), `priority` enum(low, medium, high), `notes`

**events** *(1:1 extension of a project where `is_event = true`)*
`project_id fk unique`, `event_type` enum(summit, activation, festival, internal), `venue`, `start_date`, `end_date`, `registration_capacity int`, `confirmed_attendees int` (derived preferred), `post_event_report_status` enum(not_started, drafting, complete)

**run_of_show_items**
`event_id fk`, `sort_order`, `start_time`, `end_time`, `segment_title`, `owner_id fk staff nullable`, `owner_name_freetext nullable` (for non-staff owners), `av_cue text`, `status` enum(pending, live, done, skipped)
This is the day-of-show operational view — mobile usability is an acceptance criterion.

**event_people** (speakers & guests)
`event_id fk`, `name`, `role` enum(speaker, guest, moderator, performer), `organisation`, `contact`, `confirmed boolean`, `travel_logistics text`, `notes`

**attendees**
`event_id fk`, `name`, `email`, `phone`, `ticket_type`, `checked_in boolean`, `checked_in_at`
CSV import required (registration lists arrive as spreadsheets).

**vendors** *(built in Phase 3 — fixes sequencing conflict)*
`name`, `category` enum(venue, av, catering, print, transport, security, creative_freelance, other), `contact`, `location` enum(abuja, lagos, other), `rate_notes`, `performance_rating int 1–5`, `preferred boolean`, `notes`

**project_vendors** / **event_vendors** (junction tables)
`project_id/event_id fk`, `vendor_id fk`, `engagement_notes`, `debrief_notes` (post-event performance record — the Sheedx/HerSphere lesson from the brief)

**purchase_orders**
`vendor_id fk`, `project_id fk`, `description`, `amount numeric`, `raised_date`, `approved_date nullable`, `payment_status` enum(pending, approved, paid), `payment_reference`

**revenue_entries**
`description`, `client_id fk`, `project_id fk`, `pillar`, `amount numeric`, `revenue_type` enum(project_fee, retainer, consultancy, other), `entry_month date` (first of month), `payment_status` enum(invoiced, received, overdue), `invoice_id fk nullable`, `received_date nullable`

**cost_entries**
`description`, `project_id fk nullable` (overheads allowed without project), `pillar`, `category` enum(project_cost, overhead, vendor, software, other), `vendor_id fk nullable`, `amount numeric`, `entry_month date`, `paid boolean`

**invoices**
`invoice_number` (auto: `BTE-YYYY-NNNN`, sequence enforced in DB), `client_id fk`, `project_id fk nullable`, `issued_date`, `due_date`, `status` enum(draft, sent, paid, overdue), `subtotal`, `total` (computed), `notes`
**invoice_line_items:** `invoice_id fk`, `description`, `qty`, `unit_price`, `line_total` (computed)
PDF generation server-side (`@react-pdf/renderer` or equivalent) with BTE letterhead; downloadable and stored in Supabase Storage. Overdue status auto-set by a scheduled check (Supabase cron / pg_cron) when `due_date < today` and unpaid.

**quotations**
Same shape as invoices minus numbering obligations: `title`, `client_id fk`, line items, `version`, `status` enum(draft, sent, accepted, declined). One-click "convert to invoice."

**staff**
`name`, `role_title`, `team` (e.g. Blueprint by BTE, Framehauz, Creative Team Cyprus, Admin), `pillar nullable`, `contract_type` enum(core_staff, contractor, freelancer, ace_collective), `start_date`, `nda_signed boolean`, `capacity_pct int`, `active boolean`, `notes`
Seed with the 17 people listed in the brief.

**project_assignments** (junction)
`project_id fk`, `staff_id fk`, `role_on_project`, `allocation_pct int nullable`

**payroll_entries**
`staff_id fk`, `payment_type` enum(core_staff, contractor, ace_collective_stipend), `gross_amount numeric`, `wht_rate numeric nullable`, `wht_amount numeric` (computed where applicable), `net_amount numeric`, `schedule` enum(monthly, per_project, one_off), `period_month date`, `payment_status` enum(pending, paid), `payment_date`, `payment_reference`
WHT is a first-class field from the first contractor payment — never a note.

**targets**
`year int`, `month int nullable` (null = annual), `pillar nullable` (null = company-wide), `metric` enum(revenue, profit, projects_delivered), `target_value numeric`
Progress is computed by views — never stored.

**knowledge_items**
`item_type` enum(template, brand_asset, sop, case_study), `title`, `pillar nullable`, `body text nullable` (SOPs as rich text/markdown), `file_url nullable` (Storage), `version`, `owner_id fk staff nullable`, `last_reviewed date`, `project_id fk nullable`, `client_id fk nullable`, `tags text[]`

### 5.3 Reporting views (SQL, read-only)

The monitoring layer is Postgres views (materialized only if performance demands it):
- `v_client_financials` — lifetime value, outstanding balance, last activity per client
- `v_project_financials` — revenue, cost, margin, budget variance per project
- `v_monthly_pnl` — revenue, cost, margin by month × pillar
- `v_targets_progress` — target vs. actual with pacing (YTD expected vs. YTD actual)
- `v_pipeline` — open leads by stage, weighted value, conversion rate (won ÷ closed)
- `v_receivables` — unpaid/overdue invoices with ageing buckets
- `v_staff_load` — active assignments and allocation per staff member
- `v_upcoming_deadlines` — projects and tasks due in the next 7/14 days

## 6. Application structure

```
/login
/dashboard            ← Command Centre (default landing)
/clients, /clients/[id]
/leads                ← kanban by stage + list
/proposals, /contracts
/projects, /projects/[id]   ← tabs: overview, tasks, finance, team, files
/events, /events/[id]       ← tabs: overview, run-of-show, people, vendors, attendees
/events/[id]/live           ← full-screen mobile run-of-show for day-of management
/finance                    ← tabs: revenue, costs, invoices, quotations
/invoices/[id]              ← detail + PDF download
/payroll
/staff, /staff/[id]
/vendors, /purchase-orders
/library                    ← knowledge & assets, filterable by type/pillar
/targets
/settings
```

**Command Centre widgets (all read-only, from §5.3 views):**
revenue vs. target (month + YTD) · profit vs. target · active projects by status with at-risk/delayed visually flagged · outstanding receivables · open pipeline value · deadlines next 7 days · margin by pillar (current month).

**Global requirements**
- **Quick-add:** a global "+" action (keyboard shortcut on desktop, floating button on mobile) to log revenue, cost, task, or lead from anywhere in ≤ 30 seconds. This is the single most important UX requirement in the build.
- At-risk and delayed projects visually distinct in every project view without filtering.
- Every list view supports filter by pillar and status; saved named views for common filters ("All active projects", "Overdue invoices", "Clients by pillar").
- Empty states explain what the page is for and offer the create action.

## 7. Phased build plan

Each phase is reviewed and signed off by the founder before the next begins. No scope creep within a phase — additions are proposed for the next phase.

**Phase 1 — Foundation + clients & projects**
Scaffold (Next.js + Supabase + Auth + RLS), design system (StatusBadge, formatNaira, formatDate, layout, mobile nav), tables: clients, leads, proposals, contracts, projects, tasks, staff (seeded with all 17 people).
*Acceptance:* founder logs in; 3 live BTE clients with contracts populated; a project with tasks created end-to-end; pillar field consistent everywhere; leads kanban working; usable on mobile.

**Phase 2 — Money in**
Tables: revenue_entries, cost_entries, invoices + line items, quotations, targets. Invoice PDF generation with auto numbering. `v_project_financials`, `v_monthly_pnl`, `v_targets_progress`, `v_receivables`.
*Acceptance:* a real numbered PDF invoice generated referencing a client and project; revenue vs. target visible at project and pillar level; quick-add revenue in ≤ 30 seconds.

**Phase 3 — Events & live production (vendors included)**
Tables: events, run_of_show_items, event_people, attendees, vendors, event_vendors. CSV attendee import. `/events/[id]/live` mobile run-of-show.
*Acceptance:* Sheedx Africa Summit or HerSphere Summit fully loaded — event linked to a project, working run-of-show, speakers/guests, vendors, attendees; run-of-show verified usable on a phone.

**Phase 4 — Money out + people ops + roles**
Tables: payroll_entries, project_assignments, purchase_orders, project_vendors. RBAC: roles (founder, ops_lead, team_lead, member) with RLS policies; propose the permission matrix to the founder before implementing. `v_staff_load`.
*Acceptance:* first payroll run logged with WHT computed on contractor payments; vendor directory ≥ 10 real vendors; PO flow functional; a second user account works with restricted access.

**Phase 5 — Institutional memory + monitoring**
Tables: knowledge_items. Full Command Centre dashboard from §5.3 views. `v_pipeline`, `v_client_financials`, `v_upcoming_deadlines`. Overdue-invoice cron.
*Acceptance:* Command Centre live on real data; revenue, profit, pipeline, and targets visible at a glance; ≥ 3 SOPs documented in the library; all monitoring views confirmed usable on mobile.

**Dependency rule carried from the brief:** the monitoring dashboard reads only from real, trusted data. Do not polish Phase 5 visuals against seed data — a beautiful dashboard showing wrong numbers is worse than no dashboard.

## 8. Roles and permissions (Phase 4)

| Capability | Founder | Ops Lead | Team Lead | Member |
|---|---|---|---|---|
| Finance, payroll, targets | Full | Read | — | — |
| Clients, contracts, proposals, leads | Full | Full | Read | — |
| Projects & tasks | Full | Full | Full (own pillar) | Read/update own tasks |
| Events & run-of-show | Full | Full | Full (assigned) | Read (assigned) |
| Vendors & POs | Full | Full | Read | — |
| Knowledge library | Full | Full | Read/write | Read |

Enforced via Supabase RLS, not UI hiding alone. This matrix is a starting proposal — confirm with the founder before Phase 4 implementation.

## 9. Non-functional requirements

- **Mobile:** every daily-use view verified on a 390px viewport; run-of-show and Command Centre are the priority screens.
- **Performance:** dashboard loads < 2s on 4G; list views paginated/virtualised beyond 100 rows.
- **Data integrity:** FK constraints and enums at DB level; no orphan financial entries; invoice numbers gap-free via DB sequence.
- **Backups:** Supabase PITR/daily backups enabled; a founder-accessible "Export all data as CSV" function (per table) ships in Phase 2 — the company's records must never be locked inside the app.
- **Audit:** `updated_at` triggers on all tables; Phase 4 adds a simple audit log (who changed what) on financial and payroll tables.
- **Security:** all access behind auth; RLS on every table; contract/invoice files in private Storage buckets with signed URLs; no service-role key in client code.
- **Environments:** separate Supabase projects for staging and production from Phase 1; migrations via Supabase CLI, committed to the repo.

## 10. Build conventions for Claude Code

- TypeScript throughout; generate DB types from Supabase (`supabase gen types`).
- All schema changes as versioned SQL migrations — never dashboard-only edits.
- Shared enums defined once in the database and mirrored in a single TS constants file with display labels.
- Server components for reads, server actions for writes; no client-side direct table writes without RLS review.
- Seed script: 17 staff, 5 pillars, sample targets — but live client/financial data is entered by the founder per acceptance criteria, not seeded.
- Every phase ends with: migration files, updated seed, a short CHANGELOG entry, and a founder walkthrough checklist mapped to that phase's acceptance criteria.
- Flag any structural decision not covered by this PRD to the founder before implementing. Do not make data-model decisions unilaterally.

## 11. Open questions for the founder

1. Invoice letterhead/brand assets — supply logo, colours, and required invoice fields (TIN, bank details) before Phase 2.
2. Should quotations and proposals merge into one object? (They overlap ~80%. Recommend keeping both, since proposals carry narrative scope and quotations carry priced line items.)
3. WHT rates to apply by contractor type — confirm current rates with the accountant; the system stores the rate per entry rather than hardcoding.
4. Annual and per-pillar targets for 2026 — needed before Phase 2 acceptance.
5. Domain and hosting: subdomain (e.g. admin.breaktheeyes.com) and who holds the Vercel/Supabase accounts.

---
*End of PRD v1.0*