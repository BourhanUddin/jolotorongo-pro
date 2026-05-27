# 🛥️ Jolotorongo Frontend — Next.js 16 + Tailwind CSS

Mobile-first SaaS frontend for Tanguar Haor Houseboat Management.

## 🚀 Quick Start

```bash
npm install
# set NEXT_PUBLIC_API_URL=http://localhost:5000/api in .env.local
npm run dev        # http://localhost:3000
npm run build      # production build
```

**Demo login:** `admin@jolotorongo.com` / `Admin@1234`

---

## 📁 Structure

```
app/
├── (auth)/login + register     # Public auth pages
├── (dashboard)/
│   ├── layout.tsx              # Auth guard + subscription wall
│   ├── dashboard/              # Role-aware home (3 views)
│   ├── rooms/                  # Room CRUD (boat_owner)
│   ├── bookings/               # List, new hold, detail+actions
│   ├── expenses/               # Daily expenses + finance report
│   ├── agents/                 # Owner: manage requests / Agent: find boats
│   ├── subscription/           # Plans, payment, admin approvals
│   ├── admin/                  # Super admin user management
│   └── profile/                # Profile, notifications, password
components/layout/              # TopBar + BottomNav (role-aware)
components/ui/                  # Shared UI: Spinner, Modal, Badge, Cards
lib/api.ts                      # Axios + all API helpers
lib/labels.ts                   # Bilingual (Bangla/English) labels
store/auth.store.ts             # Zustand auth (localStorage + cookie)
types/index.ts                  # Full TypeScript types
middleware.ts                   # Route protection
```

---

## 👥 Role → UI Flow

| Role | Redirect after login | Access |
|------|---------------------|--------|
| `super_admin` | `/dashboard` | Dashboard stats, admin panel, sub approvals |
| `boat_owner` (unpaid) | `/subscription` | Plans purchase page only |
| `boat_owner` (active) | `/dashboard` | Rooms, bookings, expenses, agents |
| `agent` (unverified) | `/dashboard` | Houseboat browse list only |
| `agent` (verified) | `/dashboard` | Join requests, bookings |

---

## 📱 Mobile Features
- Bottom nav with safe-area padding, role-specific tabs
- Bottom-sheet modals, 44px tap zones
- Bangla + English bilingual UI (Hind Siliguri font)
- PWA installable (`/manifest.json`)
- 30s notification polling with unread badge

---

## 🔧 Env Variables

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```
