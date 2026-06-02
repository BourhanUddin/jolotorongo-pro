const express = require("express");
const router = express.Router();
const {
  listTours, createTour, updateTour, deleteTour, getTourMatrix,
} = require("../controllers/tour.controller");
const { protect, restrictTo, requireActiveSubscription, requireVerifiedAgent } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/matrix", restrictTo("boat_owner", "manager", "agent"), requireVerifiedAgent, getTourMatrix);

router.use(restrictTo("boat_owner", "manager"), requireActiveSubscription);
router.get("/", listTours);
router.post("/", createTour);
router.patch("/:id", updateTour);
router.delete("/:id", deleteTour);

module.exports = router;
