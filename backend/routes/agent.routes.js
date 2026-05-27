const express = require("express");
const router = express.Router();
const {
  getUnverifiedAgents, verifyAgent, suspendAgent,
  listHouseboats, sendJoinRequest, getMyJoinRequests,
  getIncomingJoinRequests, approveJoinRequest, rejectJoinRequest,
} = require("../controllers/agent.controller");
const { protect, restrictTo, requireActiveSubscription } = require("../middleware/auth.middleware");

// ─── Public houseboat list (any logged-in user, even unverified agent) ───
router.get("/houseboats", protect, listHouseboats);

// ─── Agent actions (must be logged in) ──────────────────────
router.post("/join-request", protect, restrictTo("agent"), sendJoinRequest);
router.get("/join-requests/my", protect, restrictTo("agent"), getMyJoinRequests);

// ─── Boat owner: manage incoming join requests ───────────────
router.get(
  "/join-requests/incoming",
  protect,
  restrictTo("boat_owner"),
  requireActiveSubscription,
  getIncomingJoinRequests
);
router.patch(
  "/join-requests/:requestId/approve",
  protect,
  restrictTo("boat_owner"),
  requireActiveSubscription,
  approveJoinRequest
);
router.patch(
  "/join-requests/:requestId/reject",
  protect,
  restrictTo("boat_owner"),
  requireActiveSubscription,
  rejectJoinRequest
);

// ─── Super admin: verify / suspend agents ────────────────────
router.get("/unverified", protect, restrictTo("super_admin"), getUnverifiedAgents);
router.patch("/:agentId/verify", protect, restrictTo("super_admin"), verifyAgent);
router.patch("/:agentId/suspend", protect, restrictTo("super_admin"), suspendAgent);

module.exports = router;
