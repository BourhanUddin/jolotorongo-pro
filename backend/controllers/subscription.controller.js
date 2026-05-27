const User = require("../models/User");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const Houseboat = require("../models/Houseboat");
const { AppError, catchAsync } = require("../utils/appError");
const { pushNotification } = require("../utils/notification");

// ──────────────────────────────────────────────────────────────
// PUBLIC / BOAT OWNER
// ──────────────────────────────────────────────────────────────

// GET /api/subscriptions/plans  — anyone can view active plans
const getPlans = catchAsync(async (req, res) => {
  const plans = await SubscriptionPlan.find({ isActive: true }).sort("price");
  res.status(200).json({ success: true, data: { plans } });
});

// POST /api/subscriptions/purchase
// Boat owner submits payment reference and chosen plan.
// Status becomes "pending_approval" until super_admin approves.
const purchaseSubscription = catchAsync(async (req, res, next) => {
  const { planId, paymentMethod, paymentReference } = req.body;
  const user = req.user;

  if (user.role !== "boat_owner") {
    return next(new AppError("শুধুমাত্র বোট ওনার সাবস্ক্রিপশন কিনতে পারবেন।", 403));
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) {
    return next(new AppError("প্ল্যান পাওয়া যায়নি বা নিষ্ক্রিয়।", 404));
  }

  if (!paymentMethod || !paymentReference) {
    return next(new AppError("পেমেন্ট পদ্ধতি এবং রেফারেন্স নম্বর দিতে হবে।", 400));
  }

  user.subscription = {
    planId: plan._id,
    planName: plan.name,
    startDate: null,      // Set by admin on approval
    endDate: null,
    isActive: false,
    paymentMethod,
    paymentReference,
    paymentStatus: "pending_approval",
    renewalAlertSent: false,
  };
  user.status = "pending";
  await user.save();

  // Notify super admins
  const superAdmins = await User.find({ role: "super_admin" }).select("_id");
  const saIds = superAdmins.map((s) => s._id);
  if (saIds.length) {
    await pushNotification(
      saIds,
      `💳 ${user.name} "${plan.name}" প্ল্যান কিনতে চান। পেমেন্ট ভেরিফাই করুন।`,
      "warning"
    );
  }

  res.status(200).json({
    success: true,
    message: "পেমেন্ট তথ্য জমা হয়েছে। সুপার অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করুন।",
    data: { subscription: user.subscription },
  });
});

// ──────────────────────────────────────────────────────────────
// SUPER ADMIN
// ──────────────────────────────────────────────────────────────

// GET /api/subscriptions/pending — list owners awaiting approval
const getPendingApprovals = catchAsync(async (req, res) => {
  const pending = await User.find({
    role: "boat_owner",
    "subscription.paymentStatus": "pending_approval",
  }).select("-password").sort("createdAt");

  res.status(200).json({ success: true, data: { count: pending.length, users: pending } });
});

// PATCH /api/subscriptions/:userId/approve
const approveSubscription = catchAsync(async (req, res, next) => {
  const owner = await User.findById(req.params.userId);
  if (!owner || owner.role !== "boat_owner") {
    return next(new AppError("বোট ওনার পাওয়া যায়নি।", 404));
  }

  const plan = await SubscriptionPlan.findById(owner.subscription.planId);
  if (!plan) return next(new AppError("প্ল্যান পাওয়া যায়নি।", 404));

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + plan.durationDays);

  owner.subscription.startDate = now;
  owner.subscription.endDate = endDate;
  owner.subscription.isActive = true;
  owner.subscription.paymentStatus = "paid";
  owner.status = "active";
  owner.isApprovedByAdmin = true;
  await owner.save();

  // Make the linked houseboat operational
  await Houseboat.updateOne({ ownerId: owner._id }, { isOperational: true });

  await pushNotification(
    owner._id,
    `✅ আপনার "${plan.name}" সাবস্ক্রিপশন অনুমোদিত হয়েছে! মেয়াদ: ${endDate.toLocaleDateString("bn-BD")} পর্যন্ত।`,
    "success"
  );

  res.status(200).json({
    success: true,
    message: "সাবস্ক্রিপশন অনুমোদন সফল।",
    data: { user: owner },
  });
});

// PATCH /api/subscriptions/:userId/reject
const rejectSubscription = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const owner = await User.findById(req.params.userId);
  if (!owner || owner.role !== "boat_owner") {
    return next(new AppError("বোট ওনার পাওয়া যায়নি।", 404));
  }

  owner.subscription.paymentStatus = "failed";
  owner.status = "pending";
  await owner.save();

  await pushNotification(
    owner._id,
    `❌ আপনার পেমেন্ট যাচাই ব্যর্থ হয়েছে। কারণ: ${reason || "অজানা"}। পুনরায় চেষ্টা করুন।`,
    "error"
  );

  res.status(200).json({ success: true, message: "পেমেন্ট প্রত্যাখ্যান করা হয়েছে।" });
});

// ──────────────────────────────────────────────────────────────
// SUPER ADMIN — Plan CRUD
// ──────────────────────────────────────────────────────────────

const createPlan = catchAsync(async (req, res) => {
  const plan = await SubscriptionPlan.create(req.body);
  res.status(201).json({ success: true, data: { plan } });
});

const updatePlan = catchAsync(async (req, res, next) => {
  const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.planId, req.body, {
    new: true, runValidators: true,
  });
  if (!plan) return next(new AppError("প্ল্যান পাওয়া যায়নি।", 404));
  res.status(200).json({ success: true, data: { plan } });
});

const deletePlan = catchAsync(async (req, res, next) => {
  const plan = await SubscriptionPlan.findByIdAndUpdate(
    req.params.planId, { isActive: false }, { new: true }
  );
  if (!plan) return next(new AppError("প্ল্যান পাওয়া যায়নি।", 404));
  res.status(200).json({ success: true, message: "প্ল্যান নিষ্ক্রিয় করা হয়েছে।" });
});

module.exports = {
  getPlans,
  purchaseSubscription,
  getPendingApprovals,
  approveSubscription,
  rejectSubscription,
  createPlan,
  updatePlan,
  deletePlan,
};
