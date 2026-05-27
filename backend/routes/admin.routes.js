const express = require("express");
const router = express.Router();
const {
  getDashboard, getAllOwners, getAllAgents,
  suspendUser, reactivateUser, getAllHouseboats,
} = require("../controllers/admin.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

router.use(protect, restrictTo("super_admin"));

router.get("/dashboard", getDashboard);
router.get("/boat-owners", getAllOwners);
router.get("/agents", getAllAgents);
router.get("/houseboats", getAllHouseboats);
router.patch("/users/:userId/suspend", suspendUser);
router.patch("/users/:userId/reactivate", reactivateUser);

module.exports = router;
