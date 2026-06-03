# Jolotorongo Industrial SaaS Implementation Roadmap

## MVP Definition

The production MVP should include:

1. Super Admin seed login
2. Boat Owner registration
3. Subscription verification flow
4. Tenant dashboard
5. Room management
6. Admin/Manager Tour configuration
7. 2D/1N availability matrix
8. Admin/Manager direct booking flow
9. Agent booking request and approval flow
10. Agent registration and verification
11. Agent tenant join workflow
12. WhatsApp invoice link
13. Invoice and revenue ledger
14. Expense ledger
15. Basic profit report
16. Tenant isolation
17. Responsive dashboard

Do not build advanced features before the MVP foundation is stable.

---

## Priority 1 — Safety Foundation

### Tasks

- Audit project structure.
- Standardize env handling.
- Add global error handler.
- Add async handler wrapper.
- Add auth middleware.
- Add role middleware.
- Add tenant guard middleware.
- Add Zod validation folder.
- Add API response helper.

### Completion Criteria

- Unauthorized users cannot access dashboard APIs.
- Admin cannot access another tenant.
- Agent cannot access unapproved tenant.
- Invalid payloads return clean validation errors.

---

## Priority 2 — Tour & Booking Engine

### Tasks

- Ensure Tour model has:
  - houseboatId
  - title
  - checkIn
  - checkOut
  - roomIds
  - createdById
  - status

- Ensure Booking model has:
  - houseboatId
  - roomId
  - checkIn
  - checkOut
  - status
  - expiresAt
  - bookingTrack
  - agentId optional
  - approvedById optional
  - referenceName for Admin/Manager direct bookings
  - agentCommission
  - netRevenue

- Implement overlap availability.
- Implement Admin/Manager direct booking.
- Block Agent direct holds/locks.
- Implement Agent booking requests.
- Implement hold expiry cron.
- Implement room availability API.
- Implement tour matrix API.
- Make tour matrix return rooms only when an active Tour exists for exact selected 2D/1N date.
- Implement admin manifest API.

### Completion Criteria

- Create Tour never creates a booking.
- Tour rooms initialize as available for selected date.
- Agent pending requests do not lock rooms.
- Admin/Manager approval of agent request books the room.
- Room can be booked on one date and available on another.
- Mobile grid can show available/on_hold/booked.

---

## Priority 3 — Agent System

### Tasks

- Agent free registration.
- Global verification by Super Admin.
- Agent browse active tenants.
- Agent join request.
- Owner approve/reject agent.
- Agent can view availability and send booking requests only after approval.
- Agent can be approved for multiple boats.
- Agent can filter by one date and view available rooms across all approved boats.
- Agent can mark pending request as payment confirmed.
- Agent can track calculated commission.

### Completion Criteria

- Unverified agent cannot request booking.
- Verified but tenant-unapproved agent cannot access availability.
- Approved agent sees only approved tenant availability and own request/commission data.
- Approved agent cannot see boat booking history.
- Approved agent cannot create tours.
- Approved agent cannot directly book/hold rooms.

---

## Priority 4 — Subscription System

### Tasks

- Owner selects plan.
- Owner submits bKash transaction ID.
- Super Admin approval/rejection.
- Middleware blocks unpaid tenant operations.
- Expiry reminder and disable cron.

### Completion Criteria

- Unpaid owner cannot create rooms/bookings.
- Paid owner can access dashboard.
- Expired subscription disables operations.

---

## Priority 5 — Finance MVP

### Tasks

- Daily expenses.
- Fixed expenses.
- Booking revenue summary.
- Auto-generated invoice records.
- Revenue ledger records.
- Agent/referral commission.
- Net profit report.
- Printable invoice.

### Completion Criteria

- Admin sees own tenant finance only.
- Manager can input expenses if allowed.
- Agent sees own commission only.
- Super Admin sees platform analytics only.
- Every confirmed booking produces Invoice and Ledger records.
- Finance report includes gross revenue, commission, net revenue, expenses, net profit.

---

## Priority 6 — Frontend UX

### Tasks

- Mobile-first dashboard layout.
- Responsive sidebar.
- Room setup wizard.
- Availability color grid.
- Tour configuration page with vessel/room assignment.
- Booking matrix page with direct booking/request forms.
- Agent request approval queue.
- Agent dashboard.
- Invoice sharing button.
- Loading/empty/error states.

### Completion Criteria

- Works on mobile, tablet, desktop.
- No horizontal overflow.
- Booking grid is touch-friendly.
- Critical actions show confirmation.

---

## Priority 7 — Production Readiness

### Tasks

- Rate limiting.
- Audit logs.
- Backup plan.
- PM2 config.
- Nginx config.
- Health checks.
- Error monitoring.
- Build/test scripts.

### Completion Criteria

- App deploys cleanly.
- Backend restarts automatically.
- HTTPS works.
- Logs are available.
- Production secrets are protected.
