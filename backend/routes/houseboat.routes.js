const express = require("express");
const router = express.Router();
const { getMyHouseboat, updateMyHouseboat, removeAgent } = require("../controllers/houseboat.controller");
const { protect, restrictTo, requireActiveSubscription } = require("../middleware/auth.middleware");

router.use(protect, restrictTo("boat_owner"), requireActiveSubscription);

router.get("/my", getMyHouseboat);
router.patch("/my", updateMyHouseboat);
router.delete("/agents/:agentId", removeAgent);

module.exports = router;