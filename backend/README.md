# 🛥️ Jolotorongo — Tanguar Haor Houseboat Management System
**Backend API v2.0** — Node.js · Express · MongoDB

---

## 🚀 Quick Start

```bash
npm install
cp .env.example .env      # fill in your values
npm run seed              # creates super admin + subscription plans
npm run dev               # starts with nodemon
```

**Super Admin credentials (after seed):**
- Email: `admin@jolotorongo.com`
- Password: `Admin@1234`

---

## 🏗️ Project Structure

```
jolotorongo/
├── models/
│   ├── User.js               # boat_owner | agent | super_admin
│   ├── Houseboat.js          # boat details + operational flag
│   ├── SubscriptionPlan.js   # plan definitions
│   ├── JoinRequest.js        # agent ↔ houseboat join flow
│   ├── Room.js               # rooms per houseboat
│   ├── Booking.js            # holds, confirmations, history
│   └── Expense.js            # daily expenses + finance
├── controllers/
│   ├── auth.controller.js
│   ├── subscription.controller.js
│   ├── agent.controller.js
│   ├── room.controller.js
│   ├── booking.controller.js
│   ├── expense.controller.js
│   └── admin.controller.js
├── routes/                   # one file per domain
├── middleware/
│   ├── auth.middleware.js     # protect | restrictTo | subscription wall | agent guard
│   └── error.middleware.js
├── services/
│   └── whatsapp.service.js   # wa.me deep-link generators
├── jobs/
│   └── scheduler.js          # cron: hold expiry + subscription alerts
├── utils/
│   ├── appError.js
│   ├── jwt.js
│   ├── notification.js
│   └── seed.js
├── config/
│   └── db.js
├── app.js
└── server.js
```

---

## 👥 Role Architecture

| Role | Registration | Activation | Access |
|------|-------------|------------|--------|
| `super_admin` | System seed only | Immediate | Full platform |
| `boat_owner` | Self-register | After subscription payment **approved by super_admin** | Own houseboat ops |
| `agent` | Self-register (free) | After **verified by super_admin** | View boats → join request → booking |

---

## 💳 Boat Owner Subscription Flow

```
Register → status: "pending"
     ↓
GET /api/subscriptions/plans  (view available plans)
     ↓
POST /api/subscriptions/purchase  { planId, paymentMethod, paymentReference }
     → subscription.paymentStatus = "pending_approval"
     → super_admin gets notified
     ↓
PATCH /api/subscriptions/:userId/approve  (super_admin)
     → subscription.isActive = true
     → subscription.endDate = now + plan.durationDays
     → houseboat.isOperational = true
     → status = "active"
     ↓
Dashboard fully unlocked ✅
     ↓
[5–7 days before expiry] → renewal alert notification + WhatsApp link
     ↓
[On expiry] → isOperational = false, status = "pending" again
```

---

## 🤝 Agent Free-Join Flow

```
Register → status: "unverified"
     ↓
Can only: GET /api/agents/houseboats  (view operational boats)
     ↓
PATCH /api/agents/:agentId/verify  (super_admin verifies)
     → status = "active", isApprovedByAdmin = true
     ↓
POST /api/agents/join-request  { houseboatId, message? }
     → boat_owner notified
     ↓
PATCH /api/agents/join-requests/:id/approve  (boat_owner)
     → agent.joinedHouseboatId = houseboatId
     → houseboat.approvedAgents += agentId
     ↓
Agent can now place holds and manage bookings ✅
```

---

## 📡 API Reference

### Auth  `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | — | Register boat_owner or agent |
| POST | `/login` | — | Login → returns JWT + redirectTo hint |
| GET | `/me` | ✅ | Get own profile + subscription |
| PATCH | `/change-password` | ✅ | Change password |
| GET | `/notifications` | ✅ | Get in-app notifications |
| PATCH | `/notifications/read-all` | ✅ | Mark all as read |

**Register body:**
```json
{
  "name": "করিম সাহেব",
  "email": "karim@example.com",
  "phone": "01712345678",
  "password": "Pass@1234",
  "role": "boat_owner"
}
```

**Login response includes `redirectTo`:**
- `"/subscription/plans"` → if boat_owner has no active subscription
- `"/dashboard"` → otherwise

---

### Subscriptions  `/api/subscriptions`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/plans` | Any | View all active plans |
| POST | `/purchase` | boat_owner | Submit payment + choose plan |
| GET | `/pending` | super_admin | List awaiting approvals |
| PATCH | `/:userId/approve` | super_admin | Approve + activate subscription |
| PATCH | `/:userId/reject` | super_admin | Reject with reason |
| POST | `/plans` | super_admin | Create a new plan |
| PATCH | `/plans/:planId` | super_admin | Update plan |
| DELETE | `/plans/:planId` | super_admin | Soft-delete plan |

**Purchase body:**
```json
{
  "planId": "<ObjectId>",
  "paymentMethod": "bkash",
  "paymentReference": "TXN123456"
}
```

---

### Agents  `/api/agents`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/houseboats` | Any (logged in) | List operational houseboats |
| POST | `/join-request` | agent (verified) | Request to join a houseboat |
| GET | `/join-requests/my` | agent | Own join requests status |
| GET | `/join-requests/incoming` | boat_owner | Incoming requests |
| PATCH | `/join-requests/:id/approve` | boat_owner | Approve an agent |
| PATCH | `/join-requests/:id/reject` | boat_owner | Reject with reason |
| GET | `/unverified` | super_admin | List unverified agents |
| PATCH | `/:agentId/verify` | super_admin | Verify an agent |
| PATCH | `/:agentId/suspend` | super_admin | Suspend an agent |

---

### Rooms  `/api/rooms`  _(boat_owner + active subscription)_

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List own houseboat rooms |
| GET | `/:id` | Room detail |
| POST | `/` | Create room |
| PATCH | `/:id` | Update room |
| PATCH | `/:id/toggle-active` | Enable / disable room |
| GET | `/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&houseboatId=` | Check 2D/1N slot availability (agents too) |

**Create room body:**
```json
{
  "roomNumber": "A1",
  "roomType": "double",
  "basePrice": 2500,
  "extraPersonPrice": 500,
  "maxCapacity": 2,
  "amenities": ["AC", "Attached Bath"]
}
```

---

### Bookings  `/api/bookings`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/` | owner / agent | List bookings (filtered by role) |
| GET | `/manifest?from=YYYY-MM-DD&to=YYYY-MM-DD` | owner / agent | Room allocation manifest |
| GET | `/:id` | owner / agent | Booking detail + WhatsApp link |
| POST | `/hold` | agent (verified + joined) | Place hold |
| PATCH | `/:id/confirm` | boat_owner | Confirm + release WhatsApp link |
| PATCH | `/:id/cancel` | owner / agent | Cancel |
| PATCH | `/:id/complete` | boat_owner | Mark completed |

**Hold body:**
```json
{
  "roomId": "<ObjectId>",
  "customerName": "আব্দুল করিম",
  "customerPhone": "01811111111",
  "checkIn": "2025-12-15",
  "checkOut": "2025-12-16",
  "guestCount": 3,
  "advancePaid": 1000,
  "note": "গ্রুপ ট্যুর"
}
```

---

### Booking Requests  `/api/booking-requests`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/` | agent | Send booking request for a boat/room and 2D/1N slot |
| GET | `/my` | agent | List own booking requests |
| GET | `/incoming` | boat_owner | List pending incoming booking requests |
| PATCH | `/:requestId/approve` | boat_owner | Approve request and create confirmed booking |
| PATCH | `/:requestId/reject` | boat_owner | Reject request |

**Create request body:**
```json
{
  "boatId": "<HouseboatId>",
  "roomId": "<RoomId>",
  "checkIn": "2025-12-15",
  "checkOut": "2025-12-16",
  "guestCount": 3,
  "note": "Customer prefers front deck room"
}
```

---

### Expenses  `/api/expenses`  _(boat_owner + active subscription)_

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List expenses (filter: from, to, category) |
| GET | `/report` | Revenue vs Expense vs Profit summary |
| POST | `/` | Add expense |
| PATCH | `/:id` | Update expense |
| DELETE | `/:id` | Delete expense |

---

### Super Admin  `/api/admin`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Platform-wide stats + expiring subscriptions |
| GET | `/boat-owners` | All boat owners (filter by status) |
| GET | `/agents` | All agents (filter by status) |
| GET | `/houseboats` | All houseboats with owner details |
| PATCH | `/users/:id/suspend` | Suspend any user |
| PATCH | `/users/:id/reactivate` | Reactivate a user |

---

## ⏱️ Cron Jobs

| Job | Schedule | Action |
|-----|----------|--------|
| Hold Expiry | Every 5 mins | `on_hold` bookings past `expiresAt` → `expired`; availability is recalculated from active bookings |
| Subscription Checker | Daily 8:00 AM | Deactivate expired subs + send 5-7 day renewal alerts |

---

## 🔒 Middleware Guards

```
protect              → Valid JWT required
restrictTo(roles)    → Role check
requireActiveSubscription → boat_owner must have paid + active plan
requireVerifiedAgent → agent must be super_admin verified
```

---

## 📱 Frontend Redirect Logic

After login, the backend returns `redirectTo`:

```js
if (user.role === "boat_owner" && !subscriptionActive) {
  redirectTo = "/subscription/plans"   // 🔴 Payment wall
} else {
  redirectTo = "/dashboard"            // ✅ Full access
}
```

Unverified agents should be shown a read-only "Houseboat List" page with a prompt to wait for verification.
