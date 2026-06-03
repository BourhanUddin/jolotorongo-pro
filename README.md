# 🛥️ Jolotorongo

**Jolotorongo** is a multi-tenant SaaS platform for managing houseboat operations, bookings, agents, rooms, availability, expenses, and customer invoice communication.

The system is designed for **2 Days / 1 Night (2D/1N)** houseboat tour operations and supports tenant-isolated workspaces for multiple houseboat owners.

---

## 📌 Project Overview

Jolotorongo provides:

- Multi-tenant houseboat management
- Role-based dashboards for Super Admin, Boat Owner/Admin, Manager, and Agent
- 2D/1N room availability and booking management
- Admin/Manager Tour configuration with vessel-specific room assignment
- Agent booking request and approval flow
- Multi-boat agent approval and date-filtered availability
- Legacy room hold expiry support
- Invoice, ledger, expense, and profit tracking
- WhatsApp invoice/message support
- Responsive frontend with PWA-ready structure

---

## 🧱 Project Structure

```text
jolotorongo/
├── backend/          # Express REST API
├── frontend/         # Next.js frontend
├── package.json      # Monorepo scripts
├── README.md
└── Jolotorongo-pro-analysis&requirements.md
```

---

## 🧭 Core Booking Rule: 2D/1N Rotation

Jolotorongo uses a strict **2 Days / 1 Night** booking model.

Every booking must use:

```ts
checkIn   // Day 1
checkOut  // Day 2, normally checkIn + 1 day
```

Room availability must be calculated by checking whether the requested `checkIn → checkOut` slot overlaps with an existing active booking.

```ts
existing.checkIn < requested.checkOut &&
existing.checkOut > requested.checkIn
```

Only active bookings should block availability:

```ts
status in ["on_hold", "confirmed"]
```

Legacy single-date booking logic such as `tourDate` should not be used as the source of truth for new booking features.

---

## 🏗️ Tech Stack

### Frontend

- Next.js
- React
- Tailwind CSS
- PWA-ready structure
- IndexedDB/offline cache support where needed

### Backend

- Node.js
- Express
- MongoDB / Mongoose
- JWT authentication
- Role-Based Access Control
- Zod validation
- Node Cron for scheduled jobs

### External Services

- MongoDB Atlas
- Cloudinary
- WhatsApp deep-link messaging

---

## 👥 User Roles

| Role | Main Responsibility |
|---|---|
| Super Admin | Platform management, tenant approval, subscription verification, agent verification |
| Boat Owner/Admin | Houseboat setup, rooms, pricing, bookings, agents, reports |
| Manager | Bookings, expenses, invoices, daily operations |
| Agent | Approved vessel availability across one or more boats, own booking requests, payment confirmation, commission tracking |
| Customer | Receives invoice/payment instructions through WhatsApp |

---

## 🔐 Multi-Tenancy Rule

All tenant-owned data must be scoped by `houseboatId`.

Examples:

- Rooms
- Tours
- Bookings
- Booking requests
- Expenses
- Invoices
- Ledgers
- Agents / Join requests
- Payments

Tenant users must never be able to read, update, or delete data from another houseboat workspace.

---

## ⚙️ Environment Setup

### Backend Environment

Create `backend/.env`:

```env
DATABASE_URL="mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/jolotorongo?retryWrites=true&w=majority"
PORT=5000
NODE_ENV=development
JWT_SECRET="replace_with_a_long_random_secret"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:3000"

CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

### Frontend Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 🚀 Installation & Development

From the project root:

```bash
npm install
npm run install:all
```

Seed the database:

```bash
npm run seed
```

Start frontend and backend together:

```bash
npm run dev
```

Or run separately:

```bash
npm run dev:backend
npm run dev:frontend
```

Default local URLs:

```text
Backend:  http://localhost:5000
Frontend: http://localhost:3000
```

---

## 📋 Available Scripts

| Command | Description |
|---|---|
| `npm install` | Install root dependencies |
| `npm run install:all` | Install backend and frontend dependencies |
| `npm run seed` | Seed required initial data |
| `npm run dev` | Run backend and frontend together |
| `npm run dev:backend` | Run backend only |
| `npm run dev:frontend` | Run frontend only |
| `npm run build` | Build frontend for production |
| `npm run start:backend` | Start backend in production mode |
| `npm run start:frontend` | Start frontend in production mode |

---

## 🟢🟡🔴 Room Availability States

The booking UI should show slot-specific room states:

| State | Meaning |
|---|---|
| `available` | Room is free for the selected `checkIn → checkOut` slot |
| `on_hold` | Legacy/internal temporary hold with expiry time |
| `booked` | Room is confirmed/reserved for the selected slot |

Agents do not directly hold or book rooms. Agents submit booking requests; rooms become booked only after Admin/Manager approval. Agents cannot view boat booking history; they can only access approved availability plus their own requests, approved bookings, and commissions.

---

## 🧭 Tour vs Booking Flow

| Module | Purpose |
|---|---|
| Create Tour | Admin/Manager schedule a 2D/1N tour, choose vessel, edit tour identity, assign rooms. No booking actions here. |
| Bookings | Admin/Manager view date-based room matrix and directly book available rooms with mandatory Reference Name. |
| Bookings | Rooms appear only when an active Tour exists where Tour Date equals selected Booking Date. No active Tour means no room matrix. |
| Agent Booking | Agent views date-filtered availability across all approved boats and submits booking requests with customer details, note, and commission preview. |
| Revenue | Confirmed direct bookings and approved agent requests auto-create Invoice and Ledger records. |

A room can be booked for one 2D/1N rotation and still be available for another rotation.

---

## ⏱️ Background Jobs

| Job | Schedule | Purpose |
|---|---|---|
| Hold Expiry | Every 5 minutes | Expire `on_hold` bookings after `expiresAt` |
| Subscription Check | Daily, if implemented | Disable expired/unpaid tenant workspaces |

Expired holds should not block room availability.

---

## 📞 API Health Check

After starting the backend:

```bash
curl http://localhost:5000/health
```

Expected response:

```json
{
  "success": true,
  "message": "Jolotorongo API is running"
}
```

---

## 🔒 Production Checklist

Before production deployment:

- [ ] Replace development `JWT_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Restrict MongoDB Atlas network access
- [ ] Configure production `FRONTEND_URL`
- [ ] Enable HTTPS
- [ ] Protect all tenant data with `houseboatId`
- [ ] Validate all request bodies with Zod
- [ ] Add rate limiting to public and booking endpoints
- [ ] Configure Cloudinary upload restrictions
- [ ] Enable database backup
- [ ] Run production build successfully

---

## 🧪 Recommended Quality Checks

Before merging any major change:

```bash
npm run build
npm run lint
npm run test
```

If a script is not available yet, add it gradually as the project matures.

---

## 📚 Development Notes

Important implementation priorities:

1. Enforce tenant isolation using `houseboatId`
2. Use `checkIn/checkOut` for all new booking logic
3. Prevent double booking with backend validation
4. Keep expired holds from blocking availability
5. Protect all routes with authentication, RBAC, and tenant guards
6. Keep Create Tour free of booking actions
7. Route Admin/Manager direct bookings and Agent requests through Booking module
8. Auto-feed confirmed bookings into Invoice/Ledger revenue records
9. Keep the dashboard responsive for mobile, tablet, and desktop
10. Avoid storing secrets or production credentials in the repository

---

## 📄 License

Private project. All rights reserved.
