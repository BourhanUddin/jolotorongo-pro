const User = require("../models/User");
const Houseboat = require("../models/Houseboat");
const { verifyToken } = require("../utils/jwt");
const { AppError, catchAsync } = require("../utils/appError");

const cookieValue = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || null;
};

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
    const rawCookieToken = cookieValue(req.headers.cookie, "jt_token");
    token = rawCookieToken ? decodeURIComponent(rawCookieToken) : null;
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
const requireActiveSubscription = catchAsync(async (req, res, next) => {
  const user = req.user;

  let owner = user;
  if (user.role === "manager") {
    if (!user.joinedHouseboatId) {
      return next(new AppError("ম্যানেজারের হাউসবোট অ্যাসাইন করা নেই।", 403));
    }
    const houseboat = await Houseboat.findById(user.joinedHouseboatId).populate("ownerId");
    if (!houseboat || !houseboat.ownerId) {
      return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));
    }
    owner = houseboat.ownerId;
  }

  if (!["boat_owner", "manager"].includes(user.role)) return next();

  const sub = owner.subscription;
  const now = new Date();
  const active =
    sub?.isActive &&
    sub?.paymentStatus === "paid" &&
    sub?.endDate &&
    new Date(sub.endDate) > now;

  if (!active) {
    return next(
      new AppError(
        "আপনার সাবস্ক্রিপশন সক্রিয় নয়। পেমেন্ট প্রুফ জমা দিন এবং সুপার অ্যাডমিন অনুমোদনের জন্য অপেক্ষা করুন।",
        403
      )
    );
  }

  next();
});

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
