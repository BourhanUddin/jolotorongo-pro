# Jolotorongo Manual Testing Checklist

## Auth

- [ ] Super Admin can login after seed.
- [ ] Boat Owner can register.
- [ ] Agent can register.
- [ ] Wrong password fails.
- [ ] Suspended user cannot login/access dashboard.
- [ ] Password is never returned in API response.

---

## Tenant Isolation

Create Tenant A and Tenant B.

- [ ] Tenant A admin cannot list Tenant B rooms.
- [ ] Tenant A admin cannot update Tenant B room by ID.
- [ ] Tenant A admin cannot view Tenant B bookings.
- [ ] Tenant A admin cannot view Tenant B expenses.
- [ ] Tenant A manager cannot access Tenant B manifest.
- [ ] Agent approved for Tenant A cannot access Tenant B availability.
- [ ] Super Admin can view both tenants.

---

## Booking Availability

Create Room A1.

- [ ] Room shows available for empty slot.
- [ ] Admin/Manager directly books Room A1 for 2026-06-10 → 2026-06-11 with Reference Name.
- [ ] Room shows booked for same slot.
- [ ] Room still shows available for 2026-06-12 → 2026-06-13.
- [ ] Cancel/reject booking if supported.
- [ ] Room no longer blocks if status is rejected/cancelled.

---

## Add Room

- [ ] Add room page loads active fleet vessels.
- [ ] `Assign to Houseboat` dropdown pre-selects the active fleet vessel.
- [ ] Changing vessel updates selected vessel state.
- [ ] AC Room Price is mandatory.
- [ ] Non-AC Room Price is mandatory.
- [ ] Single image upload works.
- [ ] Multiple image upload works.
- [ ] Amenities can be added/edited.
- [ ] Services can be added/edited.

---

## Tour Configuration

- [ ] Admin can open Create Tour.
- [ ] Manager can open Create Tour for assigned vessel.
- [ ] Agent cannot access Create Tour configuration.
- [ ] Select Vessel dropdown loads active managed vessels.
- [ ] Tour Identity defaults to selected boat name.
- [ ] Tour Identity stays editable.
- [ ] Selecting vessel loads only rooms for that vessel.
- [ ] Admin/Manager can assign any/all rooms to tour.
- [ ] Saving tour does not create booking, hold, invoice, or ledger rows.
- [ ] Assigned rooms show available in booking matrix for the tour date unless already booked.
- [ ] Admin/Manager can edit/update a tour.
- [ ] Admin/Manager can delete a tour.

---

## Overlap Cases

Existing booking:
- checkIn: 2026-06-10
- checkOut: 2026-06-11

Test requested slots:

- [ ] 2026-06-09 → 2026-06-10 should be available.
- [ ] 2026-06-10 → 2026-06-11 should be blocked.
- [ ] 2026-06-10 → 2026-06-12 should be blocked.
- [ ] 2026-06-09 → 2026-06-11 should be blocked.
- [ ] 2026-06-11 → 2026-06-12 should be available.

---

## Hold Expiry

- [ ] Create legacy hold with short expiry for testing if hold endpoint is enabled for internal/admin flow.
- [ ] Wait until expiresAt passes.
- [ ] Run cron or wait for scheduled cron.
- [ ] Hold status becomes expired.
- [ ] Room becomes available again.
- [ ] Expired hold does not disappear from history.
- [ ] Agent hold attempt returns 403 and does not lock a room.

---

## Agent Workflow

- [ ] Agent registers as unverified.
- [ ] Unverified agent cannot send join request.
- [ ] Super Admin verifies agent.
- [ ] Agent sends join request to Tenant A.
- [ ] Tenant A owner approves.
- [ ] Agent can view Tenant A availability.
- [ ] Agent cannot view Tenant B availability.
- [ ] Agent cannot access Create Tour.
- [ ] Agent cannot directly book or hold a room.
- [ ] Agent can submit booking request for Tenant A.
- [ ] Pending agent request does not change room status to booked.
- [ ] Agent can mark request as Payment Confirmed.
- [ ] Agent request form shows calculated commission.
- [ ] Owner/Manager can approve/reject request.
- [ ] Approved request creates confirmed booking and room becomes booked.
- [ ] Rejected request does not block room availability.

---

## Booking Module

- [ ] Admin/Manager selects vessel and tour date.
- [ ] Booking matrix shows rooms assigned to configured tour.
- [ ] Matrix falls back to vessel rooms when no tour exists.
- [ ] Booked room is visually locked.
- [ ] Maintenance room is visually locked.
- [ ] Available room can be selected.
- [ ] Direct booking requires Reference Name.
- [ ] Direct booking creates confirmed booking.
- [ ] Direct booking creates invoice record.
- [ ] Direct booking creates ledger record.
- [ ] Agent sees booking request form instead of direct booking form.

---

## Subscription

- [ ] Owner registers with inactive subscription.
- [ ] Inactive owner cannot create rooms.
- [ ] Owner submits payment transaction ID.
- [ ] Super Admin approves.
- [ ] Owner can create rooms.
- [ ] Expired subscription blocks operational actions.

---

## Finance

- [ ] Admin can add daily expense.
- [ ] Manager can add daily expense if allowed.
- [ ] Agent cannot add tenant expense.
- [ ] Tenant A cannot see Tenant B expenses.
- [ ] Confirmed direct booking appears in revenue.
- [ ] Approved agent booking appears in revenue.
- [ ] Invoice record exists for each successful booking.
- [ ] Ledger record exists for each successful booking.
- [ ] Gross revenue appears correctly.
- [ ] Agent commission appears correctly.
- [ ] Net revenue equals gross revenue minus commission.
- [ ] Profit report calculates net revenue minus expenses.

---

## WhatsApp Invoice

- [ ] Generate Bangla invoice message.
- [ ] Generate English invoice message.
- [ ] wa.me link opens correctly.
- [ ] Phone number is normalized.
- [ ] Message includes booking, date, room, price.
- [ ] Message does not expose private admin data.

---

## Responsive UI

Test widths:
- 360px
- 390px
- 768px
- 1024px
- 1440px

- [ ] Dashboard sidebar works on mobile.
- [ ] Tables do not overflow.
- [ ] Booking grid is touch-friendly.
- [ ] Forms are readable.
- [ ] Buttons are not too small.
- [ ] Empty/loading/error states are visible.
