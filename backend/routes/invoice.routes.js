const express = require("express");
const router = express.Router();
const {
  getTemplate,
  updateTemplate,
  getBookingInvoice,
  updateDraftForBooking,
} = require("../controllers/invoice.controller");
const { protect, restrictTo, requireActiveSubscription } = require("../middleware/auth.middleware");

router.use(protect, restrictTo("boat_owner", "manager"), requireActiveSubscription);

router.get("/template", getTemplate);
router.patch("/template", updateTemplate);
router.get("/booking/:bookingId", getBookingInvoice);
router.patch("/booking/:bookingId/draft", updateDraftForBooking);

module.exports = router;
