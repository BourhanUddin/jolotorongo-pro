const express = require("express");
const router = express.Router();
const {
  getFleetHouseboats,
  getMyHouseboat,
  updateMyHouseboat,
  removeAgent,
  createManager,
  updateManager,
  deleteManager,
} = require("../controllers/houseboat.controller");
const { protect, restrictTo, requireActiveSubscription } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/fleet", restrictTo("boat_owner", "manager"), requireActiveSubscription, getFleetHouseboats);

router.use(restrictTo("boat_owner"), requireActiveSubscription);

router.get("/my", getMyHouseboat);
router.patch("/my", updateMyHouseboat);
router.post("/managers", createManager);
router.patch("/managers/:managerId", updateManager);
router.delete("/managers/:managerId", deleteManager);
router.delete("/agents/:agentId", removeAgent);

module.exports = router;
