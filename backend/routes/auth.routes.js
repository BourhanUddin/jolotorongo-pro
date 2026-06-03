const express = require("express");
const router = express.Router();
const {
  register, login, logout, getMe, changePassword,
  requestOtp, confirmOtp, otpLogin, googleAuth,
  getNotifications, markAllNotificationsRead,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/otp/request", requestOtp);
router.post("/otp/verify", confirmOtp);
router.post("/otp/login", otpLogin);
router.post("/google", googleAuth);

router.use(protect); // All below require authentication
router.get("/me", getMe);
router.patch("/change-password", changePassword);
router.get("/notifications", getNotifications);
router.patch("/notifications/read-all", markAllNotificationsRead);

module.exports = router;
