# Jolotorongo Requirements & Analysis

## 1. System Overview

Jolotorongo is a production multi-tenant SaaS platform for Tanguar Haor houseboat operators. It uses a shared MongoDB database with tenant isolation through `houseboatId`.

The current backend stack is Node.js, Express, MongoDB, Mongoose, JWT auth, Multer/Cloudinary or local upload fallback, and node-cron. The current frontend stack is Next.js App Router, React, TypeScript, Tailwind CSS, TanStack Query, and PWA/offline cache helpers.

## 2. Goals

- Manage active fleet vessels, rooms, tours, bookings, agents, revenue, expenses, invoices, and ledgers.
- Keep all tenant-owned data scoped by `houseboatId`.
- Separate Tour configuration from Booking operations.
- Support direct Admin/Manager bookings and Agent booking requests with approval gate.
- Automatically aggregate confirmed bookings into revenue, invoice, and ledger records.

## 3. Roles

| Role | Responsibilities |
| --- | --- |
| Super Admin | Verify owners/agents, approve subscriptions, manage platform users/plans, view global admin data. |
| Admin / Boat Owner | Manage own houseboat, rooms, tours, bookings, agents, managers, expenses, revenue. |
| Manager | Manage assigned houseboat tours, bookings, expenses, manifests, and revenue operations. |
| Agent | View approved boat availability, submit booking requests, mark payment collected, track commission. |
| Customer External | Receives WhatsApp invoice/payment communication only; no dashboard user. |

## 4. Core Functional Requirements

### 4.1 Authentication & Access Control

- JWT-based auth.
- Role guards for all protected routes.
- Tenant scope derived from logged-in user.
- Active subscription required for owner operational actions.
- Verified agent required for agent availability and request flows.

### 4.2 Room Management

- Admin/Manager can create, update, disable rooms for own vessel.
- Room must be assigned to a specific active houseboat through `Assign to Houseboat`.
- Active fleet vessels are loaded dynamically from `/api/houseboat/fleet`.
- Default selected vessel is the user's active fleet vessel.
- Room supports:
  - single/multiple image uploads
  - saved `images[]` displayed in room cards and booking/agent room cards
  - one climate mode per room: `ac` or `non_ac`
  - `acRoomPrice`
  - `nonAcRoomPrice`
  - `extraPersonPrice`
  - `maxCapacity`
  - `amenities`
  - `services`
  - `images`

### 4.3 Tour Configuration

- Create Tour is Admin/Manager only.
- Agents cannot access Tour create/edit/delete workflow.
- Tour has:
  - `houseboatId`
  - editable `title`
  - `checkIn`
  - `checkOut`
  - assigned `roomIds`
  - `status`
  - `note`
- Selecting vessel loads rooms linked to that houseboat.
- Admin/Manager selects rooms assigned to that Tour instance.
- No booking buttons or booking workflow are allowed inside Create Tour.
- Selected tour rooms initialize as available for that scheduled 2D/1N date unless blocked by actual bookings.
- Booking matrix must show rooms only for an active scheduled Tour with exact `checkIn/checkOut` equality to selected Booking date.
- If no active Tour exists for the selected date, no rooms are shown.

### 4.4 Booking Operations

#### Admin / Manager

- Booking page displays a date-based room matrix for selected vessel and tour date.
- Booking page does not fall back to all vessel rooms when no Tour exists.
- Assigned rooms show real-time status:
  - Available
  - On Hold
  - Booked
  - Maintenance
- Booked/on-hold/maintenance rooms are locked visually and operationally.
- Admin/Manager can directly book available rooms.
- Direct booking requires `referenceName`.
- Successful direct booking creates:
  - confirmed Booking
  - Invoice
  - Ledger entry
  - net revenue record

#### Agent

- Agent cannot create Tours.
- Agent cannot directly book or hold/lock rooms.
- Agent can only view booking availability for approved tenant networks.
- Agent approval is multi-boat and stored in `Houseboat.approvedAgents[]`.
- `User.joinedHouseboatId` is backward-compatible only and must not limit multi-boat approval.
- Agent can filter one 2D/1N date and see available rooms across all approved boats with active Tours on that exact date.
- Agent submits BookingRequest with:
  - customer name/contact/address
  - guest count
  - selected room
  - trip date
  - note
  - calculated agent commission
- Agent can mark a pending request as `paymentConfirmedByAgent`.
- Agent cannot see boat booking history or other agents' bookings.
- Agent can see only own booking requests, own approved bookings, and commission.
- Room status remains available until Admin/Manager approves the request.
- Admin/Manager approval creates a confirmed Booking and marks room booked.

### 4.5 2D/1N Date Rules

All booking and tour slots use:

```ts
checkIn: Date;
checkOut: Date; // normally checkIn + 1 day
```

Overlap rule:

```ts
existing.checkIn < requested.checkOut &&
existing.checkOut > requested.checkIn
```

Only these statuses block availability:

```ts
["on_hold", "confirmed"]
```

Expired, rejected, cancelled, completed, and failed records do not block availability.

### 4.6 Revenue, Invoice, Ledger

Every successful booking, whether direct or approved agent request, must create or update:

- `Invoice`
- `Ledger`
- booking revenue fields

Revenue records retain:

- booking date range
- room number/type
- vessel name
- customer and source context through booking relation
- gross revenue
- agent commission
- net revenue
- invoice number and itemized invoice lines

Finance reports aggregate ledger net revenue, agent commission, expenses, and net profit.

### 4.7 Agent Management

- Agent self-registration.
- Global verification by Super Admin.
- Tenant join request to active houseboat.
- Owner approves/rejects agent join.
- Agent availability and booking requests require both global verification and tenant approval.

### 4.8 Expenses & Finance

- Admin/Manager can create tenant-scoped expenses.
- Finance dashboard shows:
  - gross revenue
  - agent commission
  - net revenue
  - expenses
  - net profit

## 5. Current Mongoose Collections

Tenant-owned collections include:

- `Houseboat`
- `Room`
- `Tour`
- `Booking`
- `BookingRequest`
- `Expense`
- `Invoice`
- `Ledger`

`Room` includes:

```ts
houseboatId
roomNumber
roomType
acRoomPrice
nonAcRoomPrice
basePrice // backward-compatible AC fallback
extraPersonPrice
maxCapacity
amenities[]
services[]
images[]
availability[]
status
isActive
```

`Tour` includes:

```ts
houseboatId
title
checkIn
checkOut
roomIds[]
createdById
status
note
```

`BookingRequest` includes:

```ts
agentId
boatId
roomId
ownerId
tripDates
guestCount
totalPrice
agentCommission
paymentConfirmedByAgent
paymentConfirmedAt
customerName
customerPhone
customerAddress
status
note
bookingId
```

`Ledger` includes:

```ts
houseboatId
bookingId
invoiceId
roomId
agentId
vesselName
roomNumber
roomType
checkIn
checkOut
grossRevenue
agentCommission
netRevenue
source
```

## 6. Current API Modules

- `/api/auth`
- `/api/admin`
- `/api/houseboat`
- `/api/rooms`
- `/api/tours`
- `/api/bookings`
- `/api/booking-requests`
- `/api/expenses`
- `/api/subscriptions`

## 7. Responsive UI Requirements

- Mobile, tablet, desktop support.
- Booking matrix must remain usable on mobile.
- Tables need card alternatives.
- Large tap targets.
- No horizontal overflow.
- Empty/loading/error states required.

## 8. Production Notes

- Do not introduce Prisma unless migration explicitly approved.
- Keep using Mongoose for current backend.
- Keep small, reviewable patches.
- Never trust tenant IDs from client unless the route verifies that the vessel belongs to the logged-in actor.
- Never store secrets in source.
