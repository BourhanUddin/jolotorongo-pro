# Jolotorongo Production Security Checklist

## Environment

- [ ] `.env` is not committed.
- [ ] `JWT_SECRET` is long, random, and production-only.
- [ ] MongoDB Atlas IP whitelist is restricted.
- [ ] Cloudinary credentials are stored only in backend environment.
- [ ] Production frontend URL is configured in CORS.
- [ ] `NODE_ENV=production` is set on server.

---

## Authentication

- [ ] Passwords hashed with bcrypt/argon2.
- [ ] Login error messages do not reveal whether email exists.
- [ ] JWT expiry is reasonable.
- [ ] Refresh/session strategy is clear.
- [ ] HTTP-only secure cookies are used if possible.
- [ ] Inactive/suspended users cannot access protected routes.

---

## Authorization

- [ ] Every protected route has auth middleware.
- [ ] Every dashboard route has role guard.
- [ ] Every tenant route has tenant scope guard.
- [ ] Super Admin access is explicit.
- [ ] Agent access requires global verification.
- [ ] Agent access to tenant requires owner approval.
- [ ] Subscription middleware blocks unpaid tenants from operational features.

---

## Multi-Tenancy

- [ ] Room includes `houseboatId`.
- [ ] Tour includes `houseboatId`.
- [ ] Booking includes `houseboatId`.
- [ ] Expense includes `houseboatId`.
- [ ] BookingRequest includes a tenant boat reference (`boatId`) and review routes verify managed `houseboatId`.
- [ ] AgentJoinRequest includes `houseboatId`.
- [ ] Invoice/Payment/Ledger includes `houseboatId`.
- [ ] All tenant queries filter by `houseboatId`.
- [ ] Client-submitted `houseboatId` is not trusted for owner/manager routes.
- [ ] Tests exist for cross-tenant access denial.

---

## Booking Safety

- [ ] Availability uses `checkIn/checkOut`.
- [ ] Overlap rule is implemented correctly.
- [ ] Expired holds do not block availability.
- [ ] Concurrent hold creation is protected.
- [ ] Cron expires holds every 5 minutes.
- [ ] Availability reads refresh expired holds if needed.
- [ ] Agent booking requests do not lock rooms.
- [ ] Agents cannot directly book or hold rooms.
- [ ] Admin/Manager direct bookings require Reference Name.
- [ ] Confirmed bookings create Invoice and Ledger records.
- [ ] Agents cannot approve their own bookings.

---

## Input Validation

- [ ] Zod schema validates every write request.
- [ ] ObjectId/string IDs are validated.
- [ ] Phone numbers are normalized.
- [ ] Dates are validated and timezone-safe.
- [ ] Amounts/prices are non-negative.
- [ ] File uploads are restricted by type and size.

---

## Public Routes

- [ ] Public booking route is rate-limited.
- [ ] Public invoice/payment route does not expose private data.
- [ ] Customer WhatsApp flow does not require dashboard login.
- [ ] Error responses do not leak stack traces.

---

## Deployment

- [ ] HTTPS enabled.
- [ ] Nginx reverse proxy configured.
- [ ] PM2 process config created.
- [ ] Logs are rotated.
- [ ] Database backup strategy exists.
- [ ] Server firewall configured.
- [ ] Health check endpoint exists.

---

## Monitoring

- [ ] Backend errors are logged.
- [ ] Failed login attempts are monitored.
- [ ] Suspicious booking/hold spam is monitored.
- [ ] Cron job failures are logged.
- [ ] Payment/subscription approval actions are audit logged.
