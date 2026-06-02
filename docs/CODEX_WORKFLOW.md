# Codex Workflow for Building Jolotorongo as Industrial SaaS

## Goal

Use Codex as a senior engineering assistant, not as a random code generator.

Your job as junior developer:
- give Codex clear context
- assign small tasks
- review output
- test after each patch
- keep documentation updated

Codex should not receive vague prompts like:

> "Make full SaaS."

Instead, give it controlled engineering tasks.

---

## Recommended Development Phases

### Phase 0 — Audit Existing Project

Ask Codex:

```text
Read AGENTS.md, README.md, and the current backend/frontend structure.
Create a short technical audit:
1. current architecture
2. completed modules
3. incomplete modules
4. security risks
5. multi-tenancy risks
6. booking logic risks
7. best next 10 tasks
Do not edit files.
```

### Phase 1 — Stabilize Foundation

Tasks:
- environment validation
- consistent error handler
- auth middleware review
- role guard review
- tenant guard review
- Zod validation structure
- API response format standardization

### Phase 2 — Correct Booking Engine

Tasks:
- separate Tour configuration from Booking operations
- replace old `tourDate` logic with `checkIn/checkOut`
- enforce overlap rule
- Admin/Manager direct booking with mandatory Reference Name
- Agent booking request without room lock
- legacy hold expiry cron
- availability API
- tour matrix API
- admin manifest API

### Phase 3 — Tenant & RBAC Hardening

Tasks:
- ensure all tenant collections include `houseboatId`
- check all controller queries for tenant scoping
- prevent agents from accessing unapproved tenants
- add Super Admin exceptions carefully

### Phase 4 — SaaS Subscription Layer

Tasks:
- owner registration
- subscription status
- bKash transaction submission
- Super Admin approval/rejection
- subscription expiry cron
- disable tenant dashboard when unpaid

### Phase 5 — Agent Workflow

Tasks:
- free registration
- global verification
- tenant join request
- owner approval
- agent availability access
- agent booking request
- agent payment-confirmed marker
- agent commission tracking

### Phase 6 — Finance & Invoice

Tasks:
- daily expense ledger
- fixed expense ledger
- commission calculation
- auto-generated Invoice records
- booking revenue Ledger records
- invoice generation
- WhatsApp invoice message templates
- profit reports

### Phase 7 — Production Readiness

Tasks:
- rate limiting
- audit logs
- backups
- deployment scripts
- PM2 config
- Nginx config sample
- security checklist
- seed script safety
- test suite

---

## Codex Token-Saving Rules

Use this pattern:

```text
Read only these files first:
- AGENTS.md
- README.md
- backend/src/controllers/booking*
- backend/src/models/booking*
- backend/src/routes/booking*

Task:
Fix only 2D/1N overlap availability logic.

Do not scan unrelated frontend files unless needed.
Do not rewrite the whole module.
After patch, show changed files and tests.
```

Why this works:
- reduces token usage
- prevents unnecessary edits
- keeps Codex focused
- makes review easier

---

## Good Codex Prompt Format

```text
Context:
This is Jolotorongo, a multi-tenant houseboat SaaS.
Read AGENTS.md first.

Problem:
Booking availability must be based on checkIn/checkOut overlap, not single tourDate. Agents submit booking requests only; Admin/Manager finalize bookings.

Files to inspect first:
- backend/src/models/Booking*
- backend/src/controllers/booking*
- backend/src/routes/booking*
- backend/src/services/availability*

Rules:
- tenant data must be scoped by houseboatId
- active statuses are on_hold and confirmed
- expired holds must not block rooms
- Create Tour must not create bookings
- Agent booking requests must not lock rooms
- no full rewrite

Deliver:
1. patch implementation
2. validation
3. tests or manual test steps
4. summary of changed files
```

---

## Bad Codex Prompt Examples

Avoid:

```text
Build the whole SaaS.
```

```text
Make it professional.
```

```text
Fix all bugs.
```

```text
Create all features.
```

These prompts burn tokens and produce unstable code.

---

## Daily Working Routine

1. Start with one feature only.
2. Ask Codex to audit the relevant files.
3. Ask Codex to propose a plan.
4. Approve/adjust the plan.
5. Let Codex patch.
6. Run the app locally.
7. Test from UI and API.
8. Commit changes.
9. Move to the next small task.

---

## Suggested Branch Strategy

```bash
main
develop
feature/auth-rbac
feature/tenant-guard
feature/booking-overlap
feature/agent-workflow
feature/subscription
feature/finance-ledger
feature/pwa-offline
```

Use one branch per feature.
Do not mix booking, finance, UI redesign, and auth in one patch.

---

## Commit Message Examples

```bash
feat(booking): enforce checkIn checkout overlap availability
fix(auth): prevent inactive users from accessing dashboard
feat(agent): add tenant join request approval flow
fix(tenant): scope expense queries by houseboatId
docs(codex): add implementation task prompts
```
