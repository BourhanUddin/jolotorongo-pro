const express = require("express");
const router = express.Router();
const {
  placeHold, confirmBooking, cancelBooking, completeBooking, getBookings, getBooking, getManifest,
} = require("../controllers/booking.controller");
const {
  protect, restrictTo, requireActiveSubscription, requireVerifiedAgent,
} = require("../middleware/auth.middleware");

router.use(protect);

// Shared list + detail (agent sees own, owner sees all in their houseboat)
router.get("/", getBookings);
router.get("/manifest", restrictTo("boat_owner", "agent", "super_admin"), getManifest);
router.get("/:id", getBooking);

// Agent: place hold (must be verified + joined a houseboat)
router.post("/hold", restrictTo("agent"), requireVerifiedAgent, placeHold);

// Boat owner: confirm / cancel / complete (requires active subscription)
router.patch("/:id/confirm", restrictTo("boat_owner"), requireActiveSubscription, confirmBooking);
router.patch("/:id/cancel", restrictTo("boat_owner", "agent"), cancelBooking);
router.patch("/:id/complete", restrictTo("boat_owner"), requireActiveSubscription, completeBooking);

module.exports = router;
