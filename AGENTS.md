# AGENTS.md — Codex Project Instructions for Jolotorongo

## Project Identity

Jolotorongo is an industrial-level multi-tenant SaaS platform for houseboat operators in Tanguar Haor / Bangladesh tourism operations.

The platform manages:
- Tenants / houseboats
- Rooms and room layouts
- 2D/1N slot-based bookings
- Agent onboarding and booking requests
- Owner/manager dashboards
- Customer WhatsApp invoice flows
- Expenses, ledgers, and trip profit analytics
- Subscription/payment verification by Super Admin

This project must be developed as production SaaS software, not as a demo or prototype.

---

## Non-Negotiable Architecture Rules

### 1. Multi-Tenancy

All tenant-owned data must be scoped by `houseboatId`.

Collections/models that must include `houseboatId`:
- Room
- Booking
- BookingRequest
- Expense
- AgentJoinRequest
- Invoice
- Payment
- Ledger
- RoomAvailability snapshot/cache if implemented
- Media records if implemented

Super Admin may query across tenants.
Admin/Manager may only query their own `houseboatId`.
Agent may only access:
- globally visible active boats where allowed
- their own join requests
- their approved tenant networks through `Houseboat.approvedAgents[]`
- bookings/holds they created
- availability for approved tenant networks
- their own booking requests, approved bookings, and commission

Never trust `houseboatId` coming from the client for protected tenant operations. Derive it from the authenticated user/session unless the actor is Super Admin.

### 2. 2D/1N Booking Rule

Jolotorongo operates on a strict 2 Days / 1 Night tour model.

New booking logic must use:

```ts
checkIn: Date;
checkOut: Date; // normally checkIn + 1 day
```

Do not use old `tourDate` logic as the source of truth.

Use this overlap rule:

```ts
existing.checkIn < requested.checkOut &&
existing.checkOut > requested.checkIn
```

Only these statuses block availability:

```ts
["on_hold", "confirmed"]
```

Expired, rejected, cancelled, completed, and failed bookings must not block availability.

### 3. Hold Mechanism

Room hold duration defaults to 60 minutes.

When a room is placed on hold:
- create booking/hold transaction with `status = "on_hold"` or equivalent pending hold state
- set `expiresAt = now + holdTimeout`
- prevent overlapping holds/bookings for the same room and date range
- release automatically through cron every 5 minutes
- also refresh expired holds before availability queries and manifest reads

Do not rely only on frontend countdown timers. Backend is the source of truth.

### 3.1 Tour-Gated Room Matrix

Bookings page must show rooms only when an active scheduled Tour exists for the exact selected 2D/1N slot.

```ts
tour.checkIn === requested.checkIn;
tour.checkOut === requested.checkOut;
tour.status === "scheduled";
```

If no active Tour exists for the selected Booking date, return no rooms. Do not fall back to all vessel rooms.

Tour Date equals Booking Date.

### 4. RBAC

Supported roles:
- `SUPER_ADMIN`
- `ADMIN` / Boat Owner
- `MANAGER`
- `AGENT`
- `CUSTOMER_EXTERNAL` only as non-authenticated invoice/payment recipient, not as dashboard user

Every protected API route must use:
1. auth middleware
2. role middleware
3. tenant scope middleware
4. subscription/verification middleware when required

Agent approval is multi-boat. Use `Houseboat.approvedAgents[]` as the source of truth. `User.joinedHouseboatId` is only a backward-compatible default and must not block access to other approved boats.

Agents must not see any boat booking history. Agents can see only availability for approved boats and their own booking requests/commissions.

### 5. Security

Never commit secrets.
Never expose JWT secrets, Cloudinary secrets, bKash credentials, MongoDB URI, or admin seed passwords.
Use HTTP-only cookies for JWT where possible.
Use bcrypt/argon2 for passwords.
Validate request payloads with Zod.
Sanitize and normalize phone numbers.
Rate-limit public booking/hold/payment endpoints.
Use secure CORS based on `FRONTEND_URL`.

### 6. Responsive UI

Every frontend change must work on:
- mobile
- tablet
- desktop

For dashboard screens:
- collapsible sidebar on mobile
- large tap targets
- no horizontal overflow
- table views must have card/mobile alternative
- booking grid must remain usable on mobile

### 7. No Big Rewrite Rule

Do not rewrite the whole codebase unless explicitly requested.
Prefer small, reviewable patches.
Before editing, inspect relevant files and understand current patterns.
After editing, summarize:
- files changed
- logic changed
- how to test
- remaining risks

---

## Expected Tech Stack

Frontend:
- Next.js App Router
- React
- TypeScript where possible
- Tailwind CSS
- PWA / service worker / IndexedDB where applicable

Backend:
- Node.js
- Express
- MongoDB
- Mongoose or existing ORM used by the project
- Zod validation
- JWT auth
- node-cron

Infrastructure:
- MongoDB Atlas
- Cloudinary
- PM2
- Nginx
- HTTPS / Let's Encrypt
- Environment-based configuration

Do not introduce Prisma if the current backend already uses Mongoose unless the user explicitly approves a migration.

---

## Required Quality Gates

After each change, run the most relevant commands available in the repository:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev
```

If a command does not exist, do not invent it. Mention that it does not exist and suggest adding it.

---

## How Codex Should Work

For each task:

1. Read this `AGENTS.md`.
2. Inspect the file tree.
3. Identify current implementation.
4. Produce a short plan.
5. Modify only necessary files.
6. Add validation/tests when practical.
7. Run checks.
8. Report exact result.

---

## Forbidden Behavior

Do not:
- remove tenant guards
- bypass validation
- use `any` everywhere
- hardcode test credentials into production files
- store passwords in plain text
- create direct database queries without `houseboatId` filtering for tenant data
- depend on frontend-only authorization
- create demo-only logic in production modules
- replace the project architecture without permission
