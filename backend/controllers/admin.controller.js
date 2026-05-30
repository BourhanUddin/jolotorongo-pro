const User = require("../models/User");
const Houseboat = require("../models/Houseboat");
const Booking = require("../models/Booking");
const { AppError, catchAsync } = require("../utils/appError");
const { pushNotification } = require("../utils/notification");

// POST /api/admin/users
const createUser = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    phone,
    password = "Jolotorongo@123",
    role,
    houseboatIds = [],
  } = req.body;

  if (!["super_admin", "boat_owner", "manager", "agent"].includes(role)) {
    return next(new AppError("ভূমিকা অবৈধ।", 400));
  }

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError("এই ইমেইল ইতিমধ্যে নিবন্ধিত।", 400));

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role,
    joinedHouseboatId: ["agent", "manager"].includes(role) && houseboatIds[0] ? houseboatIds[0] : null,
  });

  if (role === "agent" || role === "manager") {
    user.status = "active";
    user.isApprovedByAdmin = true;
    await user.save({ validateBeforeSave: false });
  } else if (role === "super_admin") {
    user.status = "active";
    user.isApprovedByAdmin = true;
    await user.save({ validateBeforeSave: false });
  }

  let createdHouseboat = null;
  if (role === "boat_owner") {
    createdHouseboat = await Houseboat.create({
      name: `${name}-এর বোট`,
      ownerId: user._id,
      isOperational: false,
    });
  }

  if (role === "agent" && houseboatIds.length > 0) {
    await Houseboat.updateMany(
      { _id: { $in: houseboatIds } },
      { $addToSet: { approvedAgents: user._id } }
    );
  }

  await pushNotification(
    user._id,
    "আপনার Jolotorongo অ্যাকাউন্ট তৈরি হয়েছে। ইমেইলের নির্দেশনা অনুসরণ করে লগইন করুন।",
    "info"
  );

  const safeUser = user.toObject();
  delete safeUser.password;

  res.status(201).json({
    success: true,
    message: "ইউজার তৈরি হয়েছে।",
    data: { user: safeUser, houseboat: createdHouseboat },
  });
});

// PATCH /api/admin/users/:userId
const updateUser = catchAsync(async (req, res, next) => {
  const { name, email, phone, role, status, houseboatIds = [] } = req.body;
  const user = await User.findById(req.params.userId);
  if (!user) return next(new AppError("ইউজার পাওয়া যায়নি।", 404));

  if (role && !["super_admin", "boat_owner", "manager", "agent"].includes(role)) {
    return next(new AppError("ভূমিকা অবৈধ।", 400));
  }

  if (email && email !== user.email) {
    const existing = await User.findOne({ email, _id: { $ne: user._id } });
    if (existing) return next(new AppError("এই ইমেইল ইতিমধ্যে নিবন্ধিত।", 400));
    user.email = email;
  }

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (role) user.role = role;
  if (status && ["unverified", "pending", "active", "suspended"].includes(status)) {
    user.status = status;
  }

  const nextRole = role || user.role;
  if (nextRole === "agent") {
    user.isApprovedByAdmin = user.status === "active";
    user.joinedHouseboatId = houseboatIds[0] || user.joinedHouseboatId || null;
    await Houseboat.updateMany(
      { approvedAgents: user._id },
      { $pull: { approvedAgents: user._id } }
    );
    if (houseboatIds.length > 0) {
      await Houseboat.updateMany(
        { _id: { $in: houseboatIds } },
        { $addToSet: { approvedAgents: user._id } }
      );
    }
  } else {
    user.joinedHouseboatId = null;
  }

  await user.save({ validateBeforeSave: false });

  const safeUser = user.toObject();
  delete safeUser.password;

  res.status(200).json({
    success: true,
    message: "ইউজার আপডেট হয়েছে।",
    data: { user: safeUser },
  });
});

// DELETE /api/admin/users/:userId
const deleteUser = catchAsync(async (req, res, next) => {
  if (String(req.user._id) === String(req.params.userId)) {
    return next(new AppError("নিজের অ্যাকাউন্ট ডিলিট করা যাবে না।", 400));
  }

  const user = await User.findById(req.params.userId);
  if (!user) return next(new AppError("ইউজার পাওয়া যায়নি।", 404));
  if (user.role === "super_admin") {
    return next(new AppError("সুপার অ্যাডমিন অ্যাকাউন্ট ডিলিট করা যাবে না।", 400));
  }

  await Houseboat.updateMany(
    { approvedAgents: user._id },
    { $pull: { approvedAgents: user._id } }
  );

  if (user.role === "boat_owner") {
    await Houseboat.deleteMany({ ownerId: user._id });
  }

  await User.deleteOne({ _id: user._id });

  res.status(200).json({ success: true, message: "ইউজার ডিলিট হয়েছে।" });
});

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

// GET /api/admin/managers
const getAllManagers = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { role: "manager" };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [managers, total] = await Promise.all([
    User.find(filter).select("-password").sort("-createdAt").skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { total, page: Number(page), pages: Math.ceil(total / limit), managers },
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
  createUser,
  updateUser,
  deleteUser,
  getDashboard,
  getAllOwners,
  getAllManagers,
  getAllAgents,
  suspendUser,
  reactivateUser,
  getAllHouseboats,
};
