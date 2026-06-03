const Houseboat = require("../models/Houseboat");
const User = require("../models/User");
const { AppError, catchAsync } = require("../utils/appError");
const { pushNotification } = require("../utils/notification");
const { requiredString, optionalString, numberValue, objectId, emailValue } = require("../utils/validation");

// GET /api/houseboat/fleet — active managed vessels for dropdowns
const getFleetHouseboats = catchAsync(async (req, res) => {
  let houseboats = [];

  if (req.user.role === "boat_owner") {
    houseboats = await Houseboat.find({ ownerId: req.user._id, isOperational: true }).sort("name");
  } else if (req.user.role === "manager" && req.user.joinedHouseboatId) {
    const houseboat = await Houseboat.findOne({ _id: req.user.joinedHouseboatId, isOperational: true });
    houseboats = houseboat ? [houseboat] : [];
  }

  const selectedHouseboatId = houseboats[0]?._id || null;
  res.status(200).json({
    success: true,
    data: {
      selectedHouseboatId,
      houseboats: houseboats.map((boat) => ({
        ...boat.toObject(),
        selected: String(boat._id) === String(selectedHouseboatId),
      })),
    },
  });
});

// GET /api/houseboat/my  — owner gets own houseboat
const getMyHouseboat = catchAsync(async (req, res, next) => {
  const houseboat = await Houseboat.findOne({ ownerId: req.user._id })
    .populate("approvedAgents", "name email phone status");
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));
  const managers = await User.find({
    role: "manager",
    joinedHouseboatId: houseboat._id,
  }).select("-password").sort("-createdAt");

  res.status(200).json({ success: true, data: { houseboat, managers } });
});

// PATCH /api/houseboat/my  — owner updates own houseboat
const updateMyHouseboat = catchAsync(async (req, res, next) => {
  const updates = {};
  if (req.body.name !== undefined) updates.name = requiredString(req.body.name, "হাউসবোট নাম", 120);
  if (req.body.location !== undefined) updates.location = optionalString(req.body.location, 160) || "Tanguar Haor";
  if (req.body.logoUrl !== undefined) updates.logoUrl = optionalString(req.body.logoUrl, 500) || null;
  if (req.body.holdTimeoutMinutes !== undefined) {
    updates.holdTimeoutMinutes = numberValue(req.body.holdTimeoutMinutes, "হোল্ড টাইমআউট", { min: 5, max: 1440, integer: true });
  }

  const houseboat = await Houseboat.findOneAndUpdate(
    { ownerId: req.user._id },
    updates,
    { new: true, runValidators: true }
  );
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));
  res.status(200).json({ success: true, message: "হাউসবোট আপডেট হয়েছে।", data: { houseboat } });
});

// DELETE /api/houseboat/agents/:agentId  — remove an agent from houseboat
const removeAgent = catchAsync(async (req, res, next) => {
  objectId(req.params.agentId, "এজেন্ট আইডি");
  const houseboat = await Houseboat.findOne({ ownerId: req.user._id });
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  await Houseboat.updateOne(
    { _id: houseboat._id },
    { $pull: { approvedAgents: req.params.agentId } }
  );

  await User.updateOne(
    { _id: req.params.agentId, joinedHouseboatId: houseboat._id },
    { joinedHouseboatId: null }
  );

  res.status(200).json({ success: true, message: "এজেন্ট সরানো হয়েছে।" });
});

// POST /api/houseboat/managers — owner creates manager for own houseboat
const createManager = catchAsync(async (req, res, next) => {
  const houseboat = await Houseboat.findOne({ ownerId: req.user._id });
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  const name = requiredString(req.body.name, "ম্যানেজারের নাম", 120);
  const email = emailValue(req.body.email);
  const phone = optionalString(req.body.phone, 40);
  const password = requiredString(req.body.password, "পাসওয়ার্ড", 128);

  const duplicateFilter = phone ? { $or: [{ email }, { phone }] } : { email };
  const existing = await User.findOne(duplicateFilter);
  if (existing) return next(new AppError("এই ইমেইল বা ফোন ইতিমধ্যে নিবন্ধিত।", 400));

  const manager = await User.create({
    name,
    email,
    phone: phone || undefined,
    password,
    role: "manager",
    status: "active",
    isApprovedByAdmin: true,
    joinedHouseboatId: houseboat._id,
  });

  await pushNotification(
    manager._id,
    `"${houseboat.name}" হাউসবোটে আপনার ম্যানেজার অ্যাকাউন্ট তৈরি হয়েছে।`,
    "success"
  );

  const safeManager = manager.toObject();
  delete safeManager.password;

  res.status(201).json({
    success: true,
    message: "ম্যানেজার তৈরি হয়েছে।",
    data: { manager: safeManager },
  });
});

const updateManager = catchAsync(async (req, res, next) => {
  objectId(req.params.managerId, "ম্যানেজার আইডি");
  const houseboat = await Houseboat.findOne({ ownerId: req.user._id });
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  const manager = await User.findOne({
    _id: req.params.managerId,
    role: "manager",
    joinedHouseboatId: houseboat._id,
  }).select("+password");
  if (!manager) return next(new AppError("ম্যানেজার পাওয়া যায়নি।", 404));

  if (req.body.name !== undefined) manager.name = requiredString(req.body.name, "ম্যানেজারের নাম", 120);
  if (req.body.email !== undefined) {
    const email = emailValue(req.body.email);
    const existing = await User.findOne({ email, _id: { $ne: manager._id } });
    if (existing) return next(new AppError("এই ইমেইল ইতিমধ্যে নিবন্ধিত।", 400));
    manager.email = email;
  }
  if (req.body.phone !== undefined) manager.phone = optionalString(req.body.phone, 40) || undefined;
  if (req.body.status !== undefined) {
    if (!["active", "suspended"].includes(req.body.status)) {
      return next(new AppError("ম্যানেজার স্ট্যাটাস অবৈধ।", 400));
    }
    manager.status = req.body.status;
  }
  if (req.body.password !== undefined) manager.password = requiredString(req.body.password, "পাসওয়ার্ড", 128);

  await manager.save();
  const safeManager = manager.toObject();
  delete safeManager.password;

  res.status(200).json({ success: true, message: "ম্যানেজার আপডেট হয়েছে।", data: { manager: safeManager } });
});

const deleteManager = catchAsync(async (req, res, next) => {
  objectId(req.params.managerId, "ম্যানেজার আইডি");
  const houseboat = await Houseboat.findOne({ ownerId: req.user._id });
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  const manager = await User.findOneAndDelete({
    _id: req.params.managerId,
    role: "manager",
    joinedHouseboatId: houseboat._id,
  });
  if (!manager) return next(new AppError("ম্যানেজার পাওয়া যায়নি।", 404));

  res.status(200).json({ success: true, message: "ম্যানেজার ডিলিট হয়েছে।" });
});

module.exports = {
  getFleetHouseboats,
  getMyHouseboat,
  updateMyHouseboat,
  removeAgent,
  createManager,
  updateManager,
  deleteManager,
};
