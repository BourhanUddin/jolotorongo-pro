const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");
const { AppError, catchAsync } = require("../utils/appError");

// ─── Protect: verify JWT ─────────────────────────────────────
const protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("অনুগ্রহ করে লগইন করুন।", 401));
  }

  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id).select("+password");

  if (!user) {
    return next(new AppError("এই টোকেনের ইউজার আর নেই।", 401));
  }

  if (user.status === "suspended") {
    return next(new AppError("আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।", 403));
  }

  req.user = user;
  next();
});

// ─── Role guard ──────────────────────────────────────────────
const restrictTo = (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError("আপনার এই কাজের অনুমতি নেই।", 403));
    }
    next();
  };

// ─── Subscription wall (boat_owner only) ─────────────────────
// Blocks any operational action if subscription is not active.
const requireActiveSubscription = (req, res, next) => {
  const user = req.user;

  if (user.role !== "boat_owner") return next(); // agents/super_admin pass through

  const sub = user.subscription;
  const now = new Date();

  if (
    !sub ||
    !sub.isActive ||
    sub.paymentStatus !== "paid" ||
    (sub.endDate && new Date(sub.endDate) < now)
  ) {
    return next(
      new AppError(
        "আপনার সাবস্ক্রিপশন সক্রিয় নেই। অনুগ্রহ করে একটি প্ল্যান কিনুন।",
        403
      )
    );
  }
  next();
};

// ─── Verified agent guard ────────────────────────────────────
// Blocks agent actions until super_admin has verified their account.
const requireVerifiedAgent = (req, res, next) => {
  const user = req.user;

  if (user.role !== "agent") return next();

  if (user.status !== "active" || !user.isApprovedByAdmin) {
    return next(
      new AppError(
        "আপনার অ্যাকাউন্ট এখনও ভেরিফাই হয়নি। সুপার অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করুন।",
        403
      )
    );
  }
  next();
};

module.exports = {
  protect,
  restrictTo,
  requireActiveSubscription,
  requireVerifiedAgent,
};
