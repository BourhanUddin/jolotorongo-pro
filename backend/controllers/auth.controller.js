const User = require("../models/User");
const Houseboat = require("../models/Houseboat");
const { sendTokenResponse } = require("../utils/jwt");
const { AppError, catchAsync } = require("../utils/appError");
const { pushNotification } = require("../utils/notification");

// ─── POST /api/auth/register ─────────────────────────────────
// Both boat_owners and agents use this endpoint.
// role must be passed in body: "boat_owner" | "agent"
const register = catchAsync(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  if (!["boat_owner", "agent"].includes(role)) {
    return next(new AppError("ভূমিকা অবৈধ। boat_owner অথবা agent হতে হবে।", 400));
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return next(new AppError("এই ইমেইল ইতিমধ্যে নিবন্ধিত।", 400));
  }

  const user = await User.create({ name, email, phone, password, role });

  // If boat_owner → auto-create a Houseboat shell (not operational yet)
  if (role === "boat_owner") {
    await Houseboat.create({
      name: `${name}-এর বোট`,
      ownerId: user._id,
      isOperational: false,
    });
  }

  const welcomeMsg =
    role === "boat_owner"
      ? "স্বাগতম! অনুগ্রহ করে একটি সাবস্ক্রিপশন প্ল্যান কিনুন।"
      : "স্বাগতম! সুপার অ্যাডমিনের ভেরিফিকেশনের জন্য অপেক্ষা করুন।";

  await pushNotification(user._id, welcomeMsg, "info");

  sendTokenResponse(user, 201, res, welcomeMsg);
});

// ─── POST /api/auth/login ────────────────────────────────────
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("ইমেইল এবং পাসওয়ার্ড দিন।", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError("ইমেইল বা পাসওয়ার্ড ভুল।", 401));
  }

  if (user.status === "suspended") {
    return next(new AppError("আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।", 403));
  }

  // Determine redirect hint for the frontend
  let redirectTo = "/dashboard";
  if (user.role === "boat_owner") {
    const sub = user.subscription;
    const subscriptionActive =
      sub?.isActive &&
      sub?.paymentStatus === "paid" &&
      sub?.endDate &&
      new Date(sub.endDate) > new Date();

    if (!subscriptionActive) redirectTo = "/subscription/plans";
  }

  const userObj = user.toObject();
  delete userObj.password;

  const { signToken } = require("../utils/jwt");
  const token = signToken(user._id);

  res.status(200).json({
    success: true,
    message: "লগইন সফল।",
    token,
    redirectTo,
    data: { user: userObj },
  });
});

// ─── GET /api/auth/me ────────────────────────────────────────
const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("subscription.planId", "name durationDays price")
    .populate("joinedHouseboatId", "name location");

  res.status(200).json({ success: true, data: { user } });
});

// ─── PATCH /api/auth/change-password ────────────────────────
const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError("বর্তমান পাসওয়ার্ড ভুল।", 401));
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res, "পাসওয়ার্ড পরিবর্তন সফল।");
});

// ─── GET /api/auth/notifications ────────────────────────────
const getNotifications = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select("notifications");
  const notes = [...user.notifications].reverse(); // newest first
  res.status(200).json({ success: true, data: { notifications: notes } });
});

// ─── PATCH /api/auth/notifications/read-all ─────────────────
const markAllNotificationsRead = catchAsync(async (req, res) => {
  await User.updateOne(
    { _id: req.user._id },
    { $set: { "notifications.$[].isRead": true } }
  );
  res.status(200).json({ success: true, message: "সব নোটিফিকেশন পড়া হয়েছে।" });
});

module.exports = {
  register,
  login,
  getMe,
  changePassword,
  getNotifications,
  markAllNotificationsRead,
};
