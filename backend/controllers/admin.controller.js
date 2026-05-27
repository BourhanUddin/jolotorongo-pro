const User = require("../models/User");
const Houseboat = require("../models/Houseboat");
const Booking = require("../models/Booking");
const { AppError, catchAsync } = require("../utils/appError");
const { pushNotification } = require("../utils/notification");

// GET /api/admin/dashboard
const getDashboard = catchAsync(async (req, res) => {
  const [
    totalOwners, activeOwners, pendingOwners,
    totalAgents, verifiedAgents, unverifiedAgents,
    totalBookings, totalHouseboats,
  ] = await Promise.all([
    User.countDocuments({ role: "boat_owner" }),
    User.countDocuments({ role: "boat_owner", status: "active" }),
    User.countDocuments({ role: "boat_owner", status: "pending" }),
    User.countDocuments({ role: "agent" }),
    User.countDocuments({ role: "agent", status: "active" }),
    User.countDocuments({ role: "agent", status: "unverified" }),
    Booking.countDocuments(),
    Houseboat.countDocuments({ isOperational: true }),
  ]);

  // Subscriptions expiring within 7 days
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const expiringOwners = await User.find({
    role: "boat_owner",
    "subscription.isActive": true,
    "subscription.endDate": { $lte: sevenDaysFromNow, $gte: new Date() },
  }).select("name email phone subscription.endDate subscription.planName");

  res.status(200).json({
    success: true,
    data: {
      owners: { total: totalOwners, active: activeOwners, pending: pendingOwners },
      agents: { total: totalAgents, verified: verifiedAgents, unverified: unverifiedAgents },
      totalBookings,
      totalOperationalHouseboats: totalHouseboats,
      expiringSubscriptions: expiringOwners,
    },
  });
});

// GET /api/admin/boat-owners
const getAllOwners = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { role: "boat_owner" };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [owners, total] = await Promise.all([
    User.find(filter).select("-password").sort("-createdAt").skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { total, page: Number(page), pages: Math.ceil(total / limit), owners },
  });
});

// GET /api/admin/agents
const getAllAgents = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { role: "agent" };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [agents, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .populate("joinedHouseboatId", "name")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { total, page: Number(page), pages: Math.ceil(total / limit), agents },
  });
});

// PATCH /api/admin/users/:userId/suspend
const suspendUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.userId);
  if (!user) return next(new AppError("ইউজার পাওয়া যায়নি।", 404));

  user.status = "suspended";
  if (user.role === "boat_owner") {
    user.subscription.isActive = false;
    await Houseboat.updateOne({ ownerId: user._id }, { isOperational: false });
  }
  await user.save();

  await pushNotification(user._id, "⛔ আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।", "error");

  res.status(200).json({ success: true, message: "ইউজার সাসপেন্ড করা হয়েছে।" });
});

// PATCH /api/admin/users/:userId/reactivate
const reactivateUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.userId);
  if (!user) return next(new AppError("ইউজার পাওয়া যায়নি।", 404));

  user.status = "active";
  user.isApprovedByAdmin = true;
  if (user.role === "boat_owner" && user.subscription.paymentStatus === "paid") {
    user.subscription.isActive = true;
    await Houseboat.updateOne({ ownerId: user._id }, { isOperational: true });
  }
  await user.save();

  await pushNotification(user._id, "✅ আপনার অ্যাকাউন্ট পুনরায় সক্রিয় করা হয়েছে।", "success");

  res.status(200).json({ success: true, message: "ইউজার পুনরায় সক্রিয় করা হয়েছে।" });
});

// GET /api/admin/houseboats
const getAllHouseboats = catchAsync(async (req, res) => {
  const houseboats = await Houseboat.find()
    .populate("ownerId", "name email phone subscription.endDate subscription.planName status")
    .sort("-createdAt");

  res.status(200).json({ success: true, data: { count: houseboats.length, houseboats } });
});

module.exports = {
  getDashboard, getAllOwners, getAllAgents, suspendUser, reactivateUser, getAllHouseboats,
};
