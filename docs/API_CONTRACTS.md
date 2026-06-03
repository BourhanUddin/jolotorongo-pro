# Jolotorongo API Contracts

This file tracks current production API behavior for the Mongoose/Express implementation.

## Global Response Format

Success:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Human readable error",
  "errors": []
}
```

Production responses must not leak stack traces or secrets.

## Auth

### POST /api/auth/register

Registers a `boat_owner` or `agent`.

Owner registration creates/links owner lifecycle and subscription flow. Agent registration creates an unverified agent.

### POST /api/auth/login

Returns auth token/user DTO and excludes password.

### GET /api/auth/me

Returns current authenticated user.

## Houseboats / Fleet

### GET /api/houseboat/fleet

Admin/Manager only.

Returns active managed vessels and default selected vessel.

```json
{
  "success": true,
  "data": {
    "selectedHouseboatId": "boat-id",
    "houseboats": [
      {
        "_id": "boat-id",
        "name": "Blue Pearl",
        "isOperational": true,
        "selected": true
      }
    ]
  }
}
```

## Rooms

### POST /api/rooms

Admin/Manager only. Multipart supported with `images` file field.

Body may be JSON or `FormData`:

```json
{
  "houseboatId": "verified-managed-boat-id",
  "roomNumber": "A1",
  "roomType": "double",
  "acRoomPrice": 5000,
  "nonAcRoomPrice": 4200,
  "extraPersonPrice": 800,
  "maxCapacity": 4,
  "amenities": ["Attached Bath", "Smart TV"],
  "services": ["Breakfast", "Life Jacket"],
  "imageUrls": []
}
```

Expected:

- backend verifies the selected houseboat belongs to current Admin/Manager
- `houseboatId` is never blindly trusted
- `basePrice` is maintained as AC fallback for backward compatibility
- each new room may use one climate mode through `climate: "ac" | "non_ac"`
- uploaded files are persisted to `images[]` and displayed by frontend room cards

### GET /api/rooms?houseboatId=...

Admin/Manager only. Returns rooms for a managed vessel.

### PATCH /api/rooms/:id

Admin/Manager only. Room must belong to actor's managed vessel.

### GET /api/rooms/availability

Query:

```http
?houseboatId=HOUSEBOAT_ID&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
```

Expected:

- agent must be verified and approved for the selected boat
- owner/manager can access only own vessel
- expired holds refreshed before response
- response includes `availabilityState`, `availableOnDate`, `blockingBookingId`

## Tours

### GET /api/tours?houseboatId=...

Admin/Manager only. Lists scheduled/cancelled/completed tours for own vessel.

### POST /api/tours

Admin/Manager only. Pure configuration, no booking side effect.

```json
{
  "houseboatId": "boat-id",
  "title": "Blue Pearl",
  "checkIn": "2026-06-10",
  "checkOut": "2026-06-11",
  "roomIds": ["room-a", "room-b"],
  "note": "Weekend tour"
}
```

Expected:

- selected vessel belongs to actor
- selected rooms belong to vessel
- 2D/1N date validation applies
- selected rooms initialize as available for the tour unless actual bookings block them

### PATCH /api/tours/:id

Admin/Manager only. Updates title, date, rooms, note, or status.

### DELETE /api/tours/:id

Admin/Manager only. Deletes own tenant tour.

### GET /api/tours/matrix

Admin/Manager/Agent.

Query:

```http
?houseboatId=HOUSEBOAT_ID&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
```

Expected:

- returns assigned tour rooms only when an active tour exactly matches `checkIn/checkOut`
- returns `rooms: []` when no active tour exists for selected date
- never falls back to all vessel rooms
- locks booked/on_hold/maintenance rooms
- agents can read only approved network availability

## Agent Availability

### GET /api/agents/available-rooms

Agent only.

Query:

```http
?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
```

Expected:

- agent must be globally verified
- agent may be approved for multiple boats
- access is derived from `Houseboat.approvedAgents[]`
- returns grouped available rooms across approved boats
- each group requires an active Tour matching the exact 2D/1N slot
- no boat booking history is returned

## Bookings

### POST /api/bookings/direct

Admin/Manager only.

```json
{
  "roomId": "room-id",
  "customerName": "Customer",
  "customerPhone": "01700000000",
  "customerAddress": "Dhaka",
  "referenceName": "Walk-in / Admin Ref",
  "checkIn": "2026-06-10",
  "checkOut": "2026-06-11",
  "guestCount": 4,
  "advancePaid": 5000,
  "pricingMode": "ac",
  "paymentMethod": "cash",
  "note": "Optional note",
  "tourName": "Blue Pearl"
}
```

Expected:

- `referenceName` mandatory
- room belongs to actor's houseboat
- overlap rule blocks only active bookings
- creates confirmed Booking
- creates/updates Invoice
- creates/updates Ledger
- feeds Finance revenue

### POST /api/bookings/hold

Legacy endpoint. Agents are not allowed to hold/lock rooms. Use `/api/booking-requests`.

Expected:

- returns 403 for agents

### GET /api/bookings

Lists scoped bookings:

- Agent sees own bookings.
- Admin/Manager sees own vessel bookings.
- Super Admin may query broader scope where supported.

### PATCH /api/bookings/:id/confirm

Admin/Manager only. Confirms existing hold/pending booking and records revenue.

### PATCH /api/bookings/:id/cancel

Admin/Manager/Agent where allowed by ownership/status.

### PATCH /api/bookings/:id/complete

Admin/Manager only.

## Booking Requests

### POST /api/booking-requests

Agent only. Does not lock room.

```json
{
  "boatId": "approved-boat-id",
  "roomId": "room-id",
  "checkIn": "2026-06-10",
  "checkOut": "2026-06-11",
  "guestCount": 4,
  "customerName": "Customer",
  "customerPhone": "01700000000",
  "customerAddress": "Optional",
  "note": "Special request"
}
```

Expected:

- agent must be globally verified
- agent must be approved for tenant network
- active booking overlap blocks request
- pending request does not block room availability
- commission is calculated and stored on request

### PATCH /api/booking-requests/:requestId/payment-confirmed

Agent only. Marks collection/payment status on pending request.

Expected:

- does not change room status
- does not create booking

### GET /api/booking-requests/my

Agent only. Returns own requests with commission/payment status.

### GET /api/booking-requests/incoming

Admin/Manager only. Returns pending requests for own vessel.

### PATCH /api/booking-requests/:requestId/approve

Admin/Manager only.

Expected:

- room still available at approval time
- creates confirmed Booking
- changes room slot to booked
- creates Invoice and Ledger
- deducts agent commission from net revenue

### PATCH /api/booking-requests/:requestId/reject

Admin/Manager only.

## Expenses / Finance

### POST /api/expenses

Admin/Manager only. Creates tenant-scoped expense.

### GET /api/expenses/report

Query:

```http
?from=YYYY-MM-DD&to=YYYY-MM-DD
```

Expected response includes:

```json
{
  "totalRevenue": 100000,
  "grossRevenue": 110000,
  "agentCommission": 10000,
  "totalExpense": 40000,
  "netProfit": 60000,
  "expenseByCategory": []
}
```

Revenue comes from Ledger when available, with Booking aggregation as fallback.

## WhatsApp / Invoice

Booking detail endpoints may include WhatsApp confirmation URLs for confirmed bookings.

Invoice records are persisted by successful confirmed bookings and can later support downloadable PDF/WhatsApp invoice delivery.
