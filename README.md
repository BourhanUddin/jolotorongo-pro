# 🛥️ জলতরঙ্গ — Jolotorongo
### Tanguar Haor Houseboat Management SaaS 

## 📁 Project Structure

```
jolotorongo/
├── backend/          ← Express REST API (Node.js + MongoDB)
├── frontend/         ← Next.js 16 + Tailwind CSS (PWA)
├── .env              ← Root env template (copy values to backend/.env)
├── package.json      ← Monorepo scripts
├── Jolotorongo-pro-analysis&requirements.md
└── README.md
```

---

## 🧭 Core Booking Rule — 2D/1N Rotation

Jolotorongo operates strictly on a **2 Days, 1 Night (2D/1N)** tour model.

Every booking must use:

```js
checkIn  // Day 1
checkOut // Day 2, normally checkIn + 1 day
```

Do not treat `tourDate` as the source of truth for new booking logic. Room availability must be calculated by checking whether the requested `checkIn` → `checkOut` slot overlaps an existing active booking.

Overlap rule:

```js
existing.checkIn < requested.checkOut &&
existing.checkOut > requested.checkIn
```

Only active bookings should block availability:

```js
status in ["on_hold", "confirmed"]
```

---

## ⚡ Setup Guide

### Step 1 — Get your MongoDB Atlas connection string

1. Go to **https://cloud.mongodb.com** and sign in (free account)
2. Create a **free M0 cluster** (or use existing)
3. Click **"Connect"** → **"Drivers"** → Copy the connection string

It looks like this:
```
mongodb+srv://myUser:myPassword@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

---

### Step 2 — Configure your .env files

**Edit `backend/.env`** — replace the placeholder with your real Atlas URI:

```env
DATABASE_URL="mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/jolotorongo?retryWrites=true&w=majority&appName=YourAppName"
PORT=5000
NODE_ENV=development
JWT_SECRET="jolotorongo_super_secret_key_change_in_production"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:3000"
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

**Edit `frontend/.env.local`** — already configured, no changes needed:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

### Step 3 — Install dependencies

```bash
# From the jolotorongo/ root folder:
npm install
npm run install:all
```

---

### Step 4 — Seed the database

```bash
npm run seed
```

Expected output:
```
✅ MongoDB সংযুক্ত: cluster0.abc123.mongodb.net
✅ সাবস্ক্রিপশন প্ল্যান তৈরি হয়েছে: বেসিক, প্রো, বার্ষিক
✅ সুপার অ্যাডমিন তৈরি হয়েছে: admin@jolotorongo.com
🌱 Seed সম্পন্ন হয়েছে।
```

---

### Step 5 — Start the project

```bash
npm run dev
```

Opens:
- **Backend API** → http://localhost:5000
- **Frontend App** → http://localhost:3000

Or in two separate terminals:
```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

---

## 🔑 Login After Seed

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@jolotorongo.com | Admin@1234 |

---

## 📋 All npm Scripts

| Command | What it does |
|---------|-------------|
| `npm install` | Install root devDependencies (concurrently) |
| `npm run install:all` | Install backend + frontend dependencies |
| `npm run seed` | Create super admin + subscription plans in DB |
| `npm run dev` | Start backend + frontend together |
| `npm run dev:backend` | Start only backend (port 5000) |
| `npm run dev:frontend` | Start only frontend (port 3000) |
| `npm run build` | Build frontend for production |
| `npm run start:backend` | Start backend in production mode |
| `npm run start:frontend` | Start frontend in production mode |

---

## 🔒 Security Checklist for Production

- [ ] Change `JWT_SECRET` to a long random string
- [ ] Set `NODE_ENV=production`
- [ ] Restrict MongoDB Atlas IP whitelist to your server IP
- [ ] Use HTTPS (Vercel/Nginx handles automatically)
- [ ] Set `FRONTEND_URL` to your production domain

---

## 👥 User Roles & Flows

### 🛥️ Boat Owner
```
Register → /subscription (must buy a plan)
  → Choose plan → Submit bKash/Nagad TXN ID
  → Super Admin approves → Full dashboard access
  → Create rooms → Manage 2D/1N bookings → View manifest → Track expenses
```

### 🤝 Agent (Free)
```
Register → /dashboard (unverified notice)
  → Super Admin verifies account
  → Browse houseboat list → Send join request
  → Boat owner approves → Search 2D/1N slot → Can place room holds
```

### 🛡️ Super Admin
```
Login → Dashboard stats
  → /subscription → Approve/reject owner payments
  → /admin → Verify agents, suspend/reactivate users
```

---

## 🟢🟡🔴 Room Availability UI

Agent booking flow must show rooms as a mobile-first color grid for the selected 2D/1N slot:

| Color | State | Meaning |
|-------|-------|---------|
| 🟢 Green | Available | Free for the full `checkIn` → `checkOut` slot |
| 🟡 Yellow | On Hold | Held by an agent; show countdown until `expiresAt` |
| 🔴 Red | Booked | Confirmed/reserved for that slot |

The visual status is slot-specific. A room can be booked for one 2D/1N rotation and available for another.

---

## 📅 Admin / Manager Manifest

Admin and manager dashboards should include a master calendar timeline or daily manifest sheet:

- Rows: rooms
- Columns: 2D/1N tour rotations
- Cells: available, on hold, booked, expired, or completed
- Booking block details: customer name, phone, agent, status, payment summary, `checkIn`, `checkOut`

Recommended API shape:

```http
GET /api/bookings/manifest?from=YYYY-MM-DD&to=YYYY-MM-DD
```

---

## ⏱️ Background Cron Jobs (auto-run with backend)

| Job | Schedule | Action |
|-----|----------|--------|
| Hold Expiry | Every 5 min | Expires `on_hold` bookings after `expiresAt` |
| Subscription Check | Daily 8 AM | Expires overdue plans + sends 7-day renewal alerts |

---

## 🔎 Availability API Requirement

Room availability endpoints should accept a target date range:

```http
GET /api/rooms/availability?houseboatId=HOUSEBOAT_ID&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
```

For each room, the response should include:

```js
{
  state: "available" | "on_hold" | "booked",
  blockingBookingId: "...",
  expiresAt: "..."
}
```

Legacy single-date `date` / `tourDate` logic should be replaced for new booking behavior.

---

## 📩 Agent Booking Requests

Agents can browse active boats from the database and send a booking request for a specific 2D/1N slot.

```http
POST /api/booking-requests
GET /api/booking-requests/my
GET /api/booking-requests/incoming
PATCH /api/booking-requests/:id/approve
PATCH /api/booking-requests/:id/reject
```

Each request tracks `agentId`, `boatId`, `roomId`, `tripDates.checkIn`, `tripDates.checkOut`, `status`, and `totalPrice`.

---

## 📞 API Health Check

After starting the backend, test it:
```bash
curl http://localhost:5000/health
# {"success":true,"message":"Jolotorongo API চালু আছে ✅"}
```
