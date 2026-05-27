const express = require("express");
const router = express.Router();
const {
  getRooms, getRoom, createRoom, updateRoom, toggleRoomActive, checkAvailability,
} = require("../controllers/room.controller");
const {
  protect, restrictTo, requireActiveSubscription, requireVerifiedAgent,
} = require("../middleware/auth.middleware");
const { uploadRoomImages } = require("../middleware/upload.middleware");

// Availability check — verified agents + boat owners
router.get(
  "/availability",
  protect,
  requireVerifiedAgent,
  checkAvailability
);

// Boat owner CRUD — blocked without active subscription
router.use(protect, restrictTo("boat_owner"), requireActiveSubscription);
router.get("/", getRooms);
router.get("/:id", getRoom);
router.post("/", uploadRoomImages, createRoom);
router.patch("/:id", uploadRoomImages, updateRoom);
router.patch("/:id/toggle-active", toggleRoomActive);

module.exports = router;
