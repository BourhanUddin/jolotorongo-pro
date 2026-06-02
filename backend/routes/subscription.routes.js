const express = require("express");
const router = express.Router();
const {
  getPlans, purchaseSubscription,
  getPendingApprovals, approveSubscription, rejectSubscription,
  createPlan, updatePlan, deletePlan,
} = require("../controllers/subscription.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { uploadPaymentScreenshot } = require("../middleware/upload.middleware");

// Public — any logged-in user can view plans
router.get("/plans", protect, getPlans);

// Boat owner actions
router.post("/purchase", protect, restrictTo("boat_owner"), uploadPaymentScreenshot, purchaseSubscription);

// Super admin actions
router.get("/pending", protect, restrictTo("super_admin"), getPendingApprovals);
router.patch("/:userId/approve", protect, restrictTo("super_admin"), approveSubscription);
router.patch("/:userId/reject", protect, restrictTo("super_admin"), rejectSubscription);

// Super admin — plan CRUD
router.post("/plans", protect, restrictTo("super_admin"), createPlan);
router.patch("/plans/:planId", protect, restrictTo("super_admin"), updatePlan);
router.delete("/plans/:planId", protect, restrictTo("super_admin"), deletePlan);

module.exports = router;
