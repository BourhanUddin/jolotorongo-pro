# Jolotorongo SaaS Architecture

## System Type

Jolotorongo is a shared-database, tenant-isolated SaaS platform.

```text
Public Landing / Super Admin Portal
            |
            +-------------------------+
            |                         |
Tenant A Workspace            Tenant B Workspace
houseboatId: A                houseboatId: B
            |                         |
            +-------------------------+
                      |
              Shared MongoDB Atlas
        All tenant data scoped by houseboatId
```

---

## Tenant Isolation

### Required Rule

Every tenant-owned document must include:

```ts
houseboatId: string
```

### Required Indexes

Recommended indexes:

```ts
{ houseboatId: 1 }
{ houseboatId: 1, createdAt: -1 }
{ houseboatId: 1, status: 1 }
{ houseboatId: 1, roomId: 1, checkIn: 1, checkOut: 1, status: 1 }
{ agentId: 1, houseboatId: 1 }
```

### Query Pattern

Bad:

```ts
Booking.find({ status: "confirmed" })
```

Good:

```ts
Booking.find({
  houseboatId: req.user.houseboatId,
  status: "confirmed",
})
```

Super Admin exception must be explicit and reviewed.

---

## Role Model

### SUPER_ADMIN

Can:
- approve/reject tenant subscriptions
- verify/suspend global agents
- view global metrics
- manage SaaS plans
- deactivate tenants

Cannot:
- accidentally act as tenant owner without explicit target tenant context

### ADMIN / Boat Owner

Can:
- manage own houseboat
- create/update rooms
- approve/reject local agents
- approve/reject bookings
- view own finance reports

Cannot:
- access another houseboat's data
- verify global agent identity
- approve platform subscriptions

### MANAGER

Can:
- create/update/delete tours for assigned houseboat
- manage bookings
- manage expenses
- view manifest
- generate invoices

Cannot:
- change subscription
- approve global agents
- access other tenants

### AGENT

Can:
- register for free
- request global verification
- request to join tenant network
- view availability after tenant approval
- view date-filtered availability across all approved boats
- submit booking requests after approval
- mark own pending booking request as payment confirmed
- track own commission

Cannot:
- access unapproved tenant data
- create/read/update/delete tour configuration
- directly book rooms
- hold or lock rooms
- approve own booking
- modify room/pricing
- view owner finance except own commissions
- view boat booking history
- view other agents' booking requests or commissions

### CUSTOMER_EXTERNAL

No dashboard login.
Receives WhatsApp invoice/payment links only.

---

## Backend Layers

Recommended backend request flow:

```text
Route
  -> auth middleware
  -> role middleware
  -> verification/subscription middleware
  -> tenant scope middleware
  -> Zod validation
  -> controller
  -> service
  -> repository/model
  -> response DTO
```

Controllers should be thin.
Business logic should live in services.
Database access should be tenant-aware.

---

## Booking Engine

### Tour Configuration

Tours are Admin/Manager-owned scheduling records. They configure which rooms are offered for a specific 2D/1N date.

```ts
Tour {
  houseboatId
  title
  checkIn
  checkOut
  roomIds[]
  createdById
  status
  note
}
```

Create Tour must not create bookings, holds, invoices, or ledger rows. It only initializes selected rooms as available for the Tour date unless a real booking later blocks them.

Booking matrix is tour-gated. It returns rooms only when an active scheduled Tour matches the requested `checkIn/checkOut` exactly. No active Tour for the selected Booking date means no rooms are shown. There is no fallback to all vessel rooms.

### Slot-Based Availability

Use:

```ts
checkIn: Date
checkOut: Date
```

The system must check if any active booking overlaps:

```ts
existing.checkIn < requested.checkOut &&
existing.checkOut > requested.checkIn
```

Active blocking statuses:

```ts
on_hold
confirmed
```

### Booking States

Recommended lifecycle:

```text
available
  -> pending_owner_approval
  -> confirmed
  -> completed

on_hold
  -> expired

pending_owner_approval
  -> rejected

confirmed
  -> cancelled
```

Depending on current codebase, this may map to existing enum names.

Current Agent rule: agents do not create `on_hold`. They create `BookingRequest` only. Room state changes to booked only when Admin/Manager approves the request and the backend creates a confirmed Booking.

Agent approval is multi-boat. `Houseboat.approvedAgents[]` is the access source of truth. `User.joinedHouseboatId` is retained only as a backward-compatible default and must not block approved access to other boats.

---

## Booking Track Types

### 1. Page Booking

Direct customer website booking.
No commission.

### 2. Referral Booking

Admin logs offline booking with referrer name.
Flat commission.

### 3. Verified Agent Request

Agent sends request through dashboard.
Percentage commission.
Does not block room availability until Admin/Manager approval.

### 4. In-Person Booking

Admin/Manager/field staff enters direct walk-in booking.
No commission unless assigned.

---

## Availability API Shape

```http
GET /api/rooms/availability?houseboatId=...&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "roomId": "room_1",
      "roomNumber": "A1",
      "state": "available",
      "blockingBookingId": null,
      "expiresAt": null
    }
  ]
}
```

States:
- available
- on_hold
- booked

## Agent Multi-Boat Availability API Shape

```http
GET /api/agents/available-rooms?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
```

Expected:
- verified active agent only
- returns only boats where `approvedAgents` contains current agent
- returns only rooms assigned to active Tours matching the exact selected slot
- returns available rooms only
- does not return boat booking history

## Tour Matrix API Shape

```http
GET /api/tours/matrix?houseboatId=...&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
```

Response supports the Booking module room matrix:

```json
{
  "success": true,
  "data": {
    "houseboat": {},
    "tour": {},
    "checkIn": "2026-06-10T00:00:00.000Z",
    "checkOut": "2026-06-11T00:00:00.000Z",
    "rooms": [
      {
        "_id": "room_1",
        "roomNumber": "A1",
        "availabilityState": "available",
        "availableOnDate": true,
        "blockingBookingId": null
      }
    ]
  }
}
```

---

## Manifest API Shape

```http
GET /api/bookings/manifest?from=YYYY-MM-DD&to=YYYY-MM-DD
```

Response should support:
- mobile cards
- desktop timeline/grid
- room rows
- 2D/1N date columns
- status blocks
- customer/agent/payment summary

---

## Finance Calculation

Confirmed bookings write revenue records:

```ts
Invoice {
  houseboatId
  bookingId
  invoiceNo
  items[]
  subtotal
  agentCommission
  netRevenue
  total
}

Ledger {
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
}
```

Net profit:

```text
Net Profit = Net Booking Revenue - Expenses
Net Booking Revenue = Gross Booking Revenue - Agent Commission
```

Recommended categories:
- food
- fuel
- repair
- staff
- docking
- marketing
- commission
- miscellaneous

---

## Production Deployment Shape

```text
Browser / PWA
    |
Next.js Frontend
    |
Express API
    |
MongoDB Atlas

Cloudinary for images
PM2 for Node process
Nginx reverse proxy
Let's Encrypt HTTPS
```

---

## Future Upgrade Path

Add only after MVP is stable:
- Socket.IO live availability updates
- bKash official payment gateway
- audit logs
- Sentry/Logtail monitoring
- queue worker for invoices
- Redis for distributed locks/holds
- analytics dashboard
- tenant custom domains
