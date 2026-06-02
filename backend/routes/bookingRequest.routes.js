const express = require("express");
const router = express.Router();
const {
  createBookingRequest,
  getMyBookingRequests,
  getIncomingBookingRequests,
  markRequestPaymentConfirmed,
  approveBookingRequest,
  rejectBookingRequest,
} = require("../controllers/bookingRequest.controller");
const { protect, restrictTo, requireActiveSubscription, requireVerifiedAgent } = require("../middleware/auth.middleware");

router.use(protect);

router.post("/", restrictTo("agent"), requireVerifiedAgent, createBookingRequest);
router.get("/my", restrictTo("agent"), requireVerifiedAgent, getMyBookingRequests);
router.patch("/:requestId/payment-confirmed", restrictTo("agent"), requireVerifiedAgent, markRequestPaymentConfirmed);

router.get(
  "/incoming",
  restrictTo("boat_owner", "manager"),
  requireActiveSubscription,
  getIncomingBookingRequests
);
router.patch(
  "/:requestId/approve",
  restrictTo("boat_owner", "manager"),
  requireActiveSubscription,
  approveBookingRequest
);
router.patch(
  "/:requestId/reject",
  restrictTo("boat_owner", "manager"),
  requireActiveSubscription,
  rejectBookingRequest
);

module.exports = router;
