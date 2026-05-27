const express = require("express");
const router = express.Router();
const {
  register, login, getMe, changePassword,
  getNotifications, markAllNotificationsRead,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/register", register);
router.post("/login", login);

router.use(protect); // All below require authentication
router.get("/me", getMe);
router.patch("/change-password", changePassword);
router.get("/notifications", getNotifications);
router.patch("/notifications/read-all", markAllNotificationsRead);

module.exports = router;
