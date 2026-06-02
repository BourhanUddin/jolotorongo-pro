# Codex Task Prompt Library for Jolotorongo

Use these prompts one by one. Do not run all at once.

---

## 1. Full Project Audit

```text
Read AGENTS.md, README.md, and the existing project structure.

Do not edit files.

Create a technical audit with:
1. current frontend structure
2. current backend structure
3. completed modules
4. incomplete modules
5. security problems
6. multi-tenancy problems
7. booking logic problems
8. mobile responsiveness problems
9. recommended next 10 implementation tasks in priority order
```

---

## 2. Tenant Guard Audit

```text
Read AGENTS.md first.

Audit all backend controllers/routes/models for tenant isolation.

Find every query that reads or mutates tenant-owned data:
- rooms
- bookings
- expenses
- booking requests
- invoices
- payments
- agents/manager tenant records

Check whether each query includes safe houseboatId scoping.

Do not edit files yet.

Return:
1. risky files
2. risky functions
3. exact problem
4. recommended patch plan
```

---

## 3. Implement Tenant Guard Middleware

```text
Read AGENTS.md first.

Implement or improve tenant guard middleware.

Rules:
- Super Admin can access cross-tenant data.
- Admin/Manager can access only their own houseboatId.
- Agent can access only allowed tenant networks and own booking records.
- Never trust client-submitted houseboatId for protected tenant operations.

Deliver:
1. middleware implementation
2. route integration
3. validation/error response
4. manual API test steps
```

---

## 4. Booking Availability Overlap Fix

```text
Read AGENTS.md and README.md first.

Fix booking availability logic to use checkIn/checkOut overlap.

Rules:
- requested slot has checkIn and checkOut
- active blocking statuses: on_hold, confirmed
- overlap rule:
  existing.checkIn < requested.checkOut &&
  existing.checkOut > requested.checkIn
- expired holds must be ignored/released
- all queries must be scoped by houseboatId

Do not rewrite unrelated modules.

Deliver:
1. changed files
2. implementation summary
3. test cases
4. manual curl/Postman examples
```

---

## 5. Tour Configuration Module

```text
Read AGENTS.md first.

Implement or improve Admin/Manager Tour configuration.

Goal:
Schedule a 2D/1N tour and assign vessel rooms without creating bookings.

Rules:
- Admin/Manager only
- Agents cannot access Create Tour
- Select Vessel dropdown uses active managed fleet
- Tour Identity defaults to boat name but stays editable
- Assigned rooms initialize as available for the Tour date
- No Book Now/direct booking/request triggers in Create Tour
- tenant scope required

Deliver:
1. implementation
2. API contract
3. manual test plan
```

---

## 6. Agent Booking Request Flow

```text
Read AGENTS.md first.

Implement/improve agent booking request flow.

Rules:
- agents cannot directly book rooms
- agents cannot hold/lock rooms
- request includes customer details and note
- request stores calculated agent commission
- agent can mark payment confirmed
- room becomes booked only after Admin/Manager approval
- all tenant scope checks required

Deliver:
1. model/controller/route changes
2. dashboard data requirements
3. manual test steps
```

---

## 7. Agent Join Request Workflow

```text
Read AGENTS.md first.

Implement agent tenant join request workflow.

Flow:
1. Agent registers for free.
2. Super Admin verifies agent globally.
3. Verified agent browses active houseboats.
4. Agent sends request to join a specific houseboat.
5. Boat Owner/Admin approves or rejects.
6. Approved agent can view availability and request bookings for that houseboat only.

Rules:
- unverified agents cannot request booking
- tenant approval is required even after global verification
- all data scoped properly

Deliver:
1. models
2. routes
3. controllers/services
4. authorization rules
5. API test examples
```

---

## 8. Super Admin Subscription Approval

```text
Read AGENTS.md first.

Implement SaaS subscription activation flow.

Flow:
1. Boat Owner registers.
2. Owner selects subscription tier.
3. Owner submits bKash transaction ID.
4. Super Admin reviews.
5. Super Admin approves/rejects.
6. Dashboard unlocks only after active subscription.

Rules:
- inactive/unpaid tenants cannot create rooms/bookings
- 7-day expiry warning if implemented
- day-30 disable cycle if implemented
- Super Admin only can approve platform subscriptions

Deliver:
1. schema/model updates
2. API routes
3. middleware updates
4. dashboard state behavior
5. manual test steps
```

---

## 9. Finance Ledger MVP

```text
Read AGENTS.md first.

Implement finance ledger MVP.

Features:
- daily variable expenses
- fixed maintenance expenses
- booking revenue summary
- commission payout summary
- auto-generated Invoice records for successful bookings
- Ledger records for successful bookings
- gross revenue, commission, net revenue
- net profit:
  net booking revenue - expenses

Rules:
- all finance data must include houseboatId
- Admin/Manager can access only own tenant finance
- Agent can only see own commission where applicable
- Super Admin can see platform-level analytics but not mutate tenant finance unless explicitly allowed

Deliver:
1. models/routes/controllers
2. DTO response shape
3. dashboard data requirements
4. manual test steps
```

---

## 10. WhatsApp Invoice Flow

```text
Read AGENTS.md first.

Implement WhatsApp invoice link generation.

Rules:
- customer does not need login
- generate wa.me link with encoded message
- support Bangla and English templates
- include booking ID, customer name, trip date, room info, total price, payment instructions
- do not expose private admin information
- phone numbers must be normalized and validated

Deliver:
1. utility/service function
2. API endpoint if needed
3. template examples
4. tests/manual test steps
```

---

## 11. Mobile Dashboard Responsiveness Audit

```text
Read AGENTS.md first.

Audit frontend dashboard responsiveness.

Check:
- mobile sidebar
- tables overflow
- booking grid usability
- forms on small screens
- touch target sizes
- loading/empty/error states

Do not edit files yet.

Return:
1. problematic pages/components
2. exact UI problem
3. recommended patch plan
4. priority order
```

---

## 12. Production Security Audit

```text
Read AGENTS.md first.

Audit the project for production security.

Check:
- secrets
- JWT config
- cookies
- CORS
- rate limiting
- password hashing
- tenant isolation
- role authorization
- input validation
- Cloudinary upload safety
- public routes
- error leakage

Do not edit files.

Return:
1. high severity issues
2. medium severity issues
3. low severity issues
4. exact recommended patches
```
