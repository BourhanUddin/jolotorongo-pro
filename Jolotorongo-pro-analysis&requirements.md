
🧭 1. Software Requirements & Analysis (SRA)
1.1 System Overview
Jolotorongo is a multi-tenant SaaS platform that enables multiple houseboat owners to manage their operations — rooms, bookings, agents, and finances — from a single responsive web and mobile interface.  
It operates under a shared database, isolated logic model.

1.2 Goals
• Manage multiple houseboats (tenants) under one platform.
• Enable owners, managers, and agents to coordinate bookings and finances efficiently.
• Ensure offline access (PWA) and real-time room status updates.
• Integrate WhatsApp for communication and invoices.

1.3 Intended Users & Roles

| User Type      | Key Responsibilities |
|----------------|----------------------|
| Super Admin | Approve new houseboats, manage subscription, global analytics. |
| Admin (Owner) | Manage houseboat setup, rooms, pricing, user access, reports. |
| Manager     | Handle bookings, expenses, invoices, daily cashflow. |
| Agent       | Request holds, view room availability, send bookings to customers. |
| Customer (External) | Receive invoice link via WhatsApp, confirm payment directly. |

1.4 Functional Requirements
A. Authentication & Access Control
• JWT and role-based authorization middleware.
• Super Admin registration restricted to system setup.
• Tenant-based isolation using houseboatId.

B. Booking Operations
Hold Request
   - Agent can place a room “on hold” for a fixed duration (default: 60 mins).
   - The system auto-releases after timeout via cron.

Direct Bookings
   - Managers/Admins can instantly confirm a booking (no pending state).

Approval Cycle
   - Managers/Admins can approve, reject, or expire bookings.

WhatsApp Integration
   - Generate wa.me URLs using localized invoice message templates (Bangla/English switchable).

C. Room Management
• Create, update, disable rooms with pricing matrix.
• Room schema includes room type, capacity, pricing, image URLs, and an `availability` array for booked/held trip slots.
• Admin/Owner can create rooms with multiple images via direct image URLs or multipart upload backed by Multer + Cloudinary.
• Real-time slot-based availability for selected check-in / check-out trip dates (Available / On Hold / Booked).

D. Expense & Finance Management
• Daily expense entry per houseboat.
• Auto-calculated profit chart (Revenue – Expenses).
• Generate printable invoice PDFs.

E. Multi-Tenancy
• Tenants separated by houseboatId.
• Super Admin can deactivate or suspend a tenant.

F. Agent Management
• Admin can create / disable agents.
• Agents limited to their own bookings and stats.
• Agents can browse active boats from the database and send booking requests for selected 2D/1N trip dates.
• BookingRequest stores agentId, boatId, roomId, tripDates, status (pending/approved/rejected), guest count, and total price.

G. System Maintenance
• Cron Jobs: Auto-expire holds every 5 minutes.
• Data Validation: Zod schema on both frontend & backend.
• Rate Limiting: Prevent booking spam.

1.5 Non-Functional Requirements

| Category | Requirements |
|-----------|---------------|
| Performance | Response time ≤ 300ms avg; scalable to 100 tenants. |
| Security | JWT + Bcrypt; role-based guards; input validation. |
| Reliability | Auto restart via PM2; uptime ≥ 99.9%. |
| Scalability | MongoDB Atlas cluster + stateless Express API. |
| Usability (Responsive) | Mobile-first flow; collapsible dashboard menus; large tap zones; offline caching via next-pwa. |
| Offline Support (PWA) | Sync bookings and availability using IndexedDB + service workers. |
| Localization | Bangla and English labels. |
| Backup | Daily MongoDB automated backups. |

1.6 System Modules

``
Frontend (Next.js 15)
│
├── Auth & Role Middleware
├── Tenant-aware Dashboard (Admin/Manager/Agent)
├── Booking Management UI
├── Room Setup Wizard
├── Expense & Report Panel
├── WhatsApp Integration Utility
└── PWA Offline Cache

Backend (Express + TypeScript)
│
├── Auth & RBAC Middleware
├── Booking Controller (Hold, Approve, Expire)
├── Room Controller
├── Expense Controller
├── User Controller
├── WhatsApp Service
├── Scheduler (node-cron)
└── Prisma ORM (MongoDB)
`

🗂️ 2. Database Design (Prisma ORM — MongoDB)
2.1 Updated Schema (mobile-first optimizations included)

`prisma
enum Role {
  SUPERADMIN
  ADMIN
  MANAGER
  AGENT
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  EXPIRED
}

enum RoomStatus {
  AVAILABLE
  ONHOLD
  BOOKED
}

model User {
  id            String      @id @default(uuid())
  name          String
  email         String      @unique
  phone         String?
  password      String
  role          Role        @default(AGENT)
  houseboatId   String?
  houseboat     Houseboat?   @relation(fields: [houseboatId], references: [id])
  bookings      Booking[]
  active        Boolean      @default(true)
  createdAt     DateTime     @default(now())
}

model Houseboat {
  id              String      @id @default(uuid())
  name            String
  location        String?
  logoUrl         String?
  holdTimeout     Int         @default(60)
  isSubscribed    Boolean     @default(false)
  subscriptionEnd DateTime?
  rooms           Room[]
  users           User[]
  bookings        Booking[]
  expenses        Expense[]
  createdAt       DateTime    @default(now())
}

model Room {
  id           String      @id @default(uuid())
  roomNumber   String
  houseboatId  String
  houseboat    Houseboat   @relation(fields: [houseboatId], references: [id])
  basePrice    Float
  extraPrice   Float
  maxCapacity  Int
  status       RoomStatus  @default(AVAILABLE)
  bookings     Booking[]
}

model Booking {
  id             String         @id @default(uuid())
  roomId         String
  room           Room           @relation(fields: [roomId], references: [id])
  agentId        String
  agent          User           @relation(fields: [agentId], references: [id])
  customerName   String
  customerPhone  String
  tourDate       DateTime
  totalPrice     Float
  status         BookingStatus  @default(PENDING)
  expiresAt      DateTime?
  approvedById   String?
  createdAt      DateTime       @default(now())
}

model Expense {
  id             String      @id @default(uuid())
  houseboatId    String
  houseboat      Houseboat   @relation(fields: [houseboatId], references: [id])
  title          String
  amount         Float
  category       String       // e.g., fuel, food, repair
  note           String?
  date           DateTime     @default(now())
  createdById    String
  createdBy      User          @relation(fields: [createdById], references: [id])
}
`

2.2 Mobile Responsiveness & Data Flow Optimization
• All CRUD endpoints return lightweight DTOs (e.g., only necessary nested relations).
• Cached data (e.g., room list, availability) stored in IndexedDB for offline access.
• Use pagination for large data tables (∞ scroll design on mobile screens).
• WhatsApp and Invoice endpoints return short links (for easy mobile sharing).

📱 3. Mobile UI Flow (Responsive UX)

| Role | Primary Mobile Screens |
|------|-------------------------|
| Super Admin | Dashboard → Tenant List → Reports |
| Admin / Manager | Dashboard → Rooms → Bookings → Expenses → Invoice |
| Agent | Search → Check Availability → Hold Request → Booking Status |
| Customer (External) | WhatsApp Invoice → Payment Done Confirmation |

🔁 4. Core Logic Summary (Backend Scheduler)

| Task | Schedule | Action |
|------|-----------|--------|
| Auto-Release Held Rooms | Every 5 mins | If Booking.status == PENDING and expiresAt < now() → status = EXPIRED, Room.status = AVAILABLE |
| Subscription Expiry | Daily | Mark unsubscribed houseboats and disable booking access. |

📘 5. Future Scalability Notes
• Upgrade Path: Add Socket.IO layer for live room status.
• Analytics: Create BookingAnalytics and AgentPerformance collections.
• Payments: Integrate Stripe or bKash gateway.
• Offline-first Storage: Use @tanstack/query + IndexedDB sync strategy.

✅ Final Deliverables Summary

| Category | Stack |
|-----------|-------|
| Frontend | Next.js 15 + React 19 (Mobile responsive + PWA) |
| Backend | Node.js + Express + Prisma + MongoDB |
| Auth | JWT with RBAC (Super Admin → Agent) |
| Realtime Ops | node-cron scheduler |
| Mobile UX | PWA offline mode + Whatsapp link sharing |
| Schema | Multi-tenant isolation via houseboatId` foreign key |

This version cleanly aligns business logic, mobile usability, and scalable SaaS design — ready for phased implementation and production deployment.
