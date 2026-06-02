const User = require("../models/User");
const Houseboat = require("../models/Houseboat");
const { sendTokenResponse } = require("../utils/jwt");
const { AppError, catchAsync } = require("../utils/appError");
const { pushNotification } = require("../utils/notification");
const { requiredString, emailValue, enumValue } = require("../utils/validation");
const {
  createOtp,
  verifyOtp,
  consumeOtpToken,
  normalizeIdentifier,
  identifierType,
} = require("../utils/otp");

const userRedirect = (user) => {
  return "/dashboard";
};

const sendAuthResponse = (user, statusCode, res, message) => {
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  const { signToken } = require("../utils/jwt");
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    message,
    token,
    redirectTo: userRedirect(user),
    data: { user: userObj },
  });
};

const contactFilter = (identifier) => {
  const normalized = normalizeIdentifier(identifier);
  return identifierType(normalized) === "email"
    ? { email: normalized }
    : { phone: normalized };
};

const findByContact = (identifier) => User.findOne(contactFilter(identifier));

// ─── POST /api/auth/register ─────────────────────────────────
// Both boat_owners and agents use this endpoint.
// role must be passed in body: "boat_owner" | "agent"
const register = catchAsync(async (req, res, next) => {
  const { name, email, phone, password, role, otpToken, otpIdentifier } = req.body;

  const normalizedRole = enumValue(role, ["boat_owner", "agent"], "ভূমিকা");
  const normalizedName = requiredString(name, "নাম", 120);
  const normalizedEmail = email ? emailValue(email) : undefined;
  const normalizedPhone = phone ? normalizeIdentifier(requiredString(phone, "ফোন নম্বর", 40)) : undefined;
  if (!normalizedEmail && !normalizedPhone) {
    return next(new AppError("ইমেইল বা ফোন নম্বর দিন।", 400));
  }

  const verified = consumeOtpToken(otpToken, otpIdentifier || normalizedEmail || normalizedPhone, "register");
  if (verified.type === "email" && verified.identifier !== normalizedEmail) {
    return next(new AppError("ভেরিফাই করা ইমেইলটি মেলেনি।", 400));
  }
  if (verified.type === "phone" && verified.identifier !== normalizedPhone) {
    return next(new AppError("ভেরিফাই করা ফোন নম্বরটি মেলেনি।", 400));
  }

  const normalizedPassword = requiredString(password, "পাসওয়ার্ড", 200);
  if (normalizedPassword.length < 6) return next(new AppError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।", 400));

  const duplicateFilters = [];
  if (normalizedEmail) duplicateFilters.push({ email: normalizedEmail });
  if (normalizedPhone) duplicateFilters.push({ phone: normalizedPhone });
  const existing = await User.findOne({ $or: duplicateFilters });
  if (existing) {
    return next(new AppError("এই ইমেইল বা ফোন ইতিমধ্যে নিবন্ধিত।", 400));
  }

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    phone: normalizedPhone,
    password: normalizedPassword,
    role: normalizedRole,
    authProvider: "password",
    isEmailVerified: verified.type === "email",
    isPhoneVerified: verified.type === "phone",
  });

  // If boat_owner → auto-create a Houseboat shell (not operational yet)
  if (normalizedRole === "boat_owner") {
    await Houseboat.create({
      name: `${normalizedName}-এর বোট`,
      ownerId: user._id,
      isOperational: false,
    });
  }

  const welcomeMsg =
    normalizedRole === "boat_owner"
      ? "স্বাগতম! আপনার বোট ম্যানেজমেন্ট ড্যাশবোর্ড প্রস্তুত।"
      : "স্বাগতম! সুপার অ্যাডমিনের ভেরিফিকেশনের জন্য অপেক্ষা করুন।";

  await pushNotification(user._id, welcomeMsg, "info");

  sendAuthResponse(user, 201, res, welcomeMsg);
});

// ─── POST /api/auth/login ────────────────────────────────────
const login = catchAsync(async (req, res, next) => {
  const { email, phone, identifier, password } = req.body;
  const contact = identifier || email || phone;

  if (!contact || !password) {
    return next(new AppError("ইমেইল/ফোন এবং পাসওয়ার্ড দিন।", 400));
  }

  const user = await User.findOne(contactFilter(contact)).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError("ইমেইল/ফোন বা পাসওয়ার্ড ভুল।", 401));
  }

  if (user.status === "suspended") {
    return next(new AppError("আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।", 403));
  }

  sendAuthResponse(user, 200, res, "লগইন সফল।");
});

const requestOtp = catchAsync(async (req, res) => {
  const { identifier, purpose = "login" } = req.body;
  const otp = createOtp(identifier, purpose);
  res.status(200).json({
    success: true,
    message: "OTP পাঠানো হয়েছে।",
    data: otp,
  });
});

const confirmOtp = catchAsync(async (req, res) => {
  const { identifier, otp, purpose = "login" } = req.body;
  const verified = verifyOtp(identifier, otp, purpose);
  res.status(200).json({
    success: true,
    message: "OTP ভেরিফাই হয়েছে।",
    data: verified,
  });
});

const otpLogin = catchAsync(async (req, res, next) => {
  const { identifier, otpToken } = req.body;
  const verified = consumeOtpToken(otpToken, identifier, "login");
  const user = await findByContact(verified.identifier);
  if (!user) return next(new AppError("এই ইমেইল/ফোনে কোনো অ্যাকাউন্ট নেই।", 404));
  if (user.status === "suspended") {
    return next(new AppError("আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।", 403));
  }
  sendAuthResponse(user, 200, res, "OTP লগইন সফল।");
});

const verifyGoogleToken = async (credential) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) throw new AppError("Google token যাচাই ব্যর্থ।", 401);
  const profile = await response.json();
  if (profile.aud !== clientId) throw new AppError("Google client মিলছে না।", 401);
  if (profile.email_verified !== "true" && profile.email_verified !== true) {
    throw new AppError("Google ইমেইল ভেরিফাইড নয়।", 401);
  }
  return {
    googleId: profile.sub,
    email: profile.email,
    name: profile.name || profile.email,
    picture: profile.picture,
  };
};

const googleAuth = catchAsync(async (req, res, next) => {
  const { credential, email, name, phone, role = "agent", googleId = "demo-google-user" } = req.body;
  const normalizedRole = enumValue(role, ["boat_owner", "agent"], "ভূমিকা");
  let profile = credential ? await verifyGoogleToken(credential) : null;

  if (!profile) {
    if (process.env.NODE_ENV === "production") {
      return next(new AppError("Google credential দরকার।", 400));
    }
    profile = {
      googleId,
      email: emailValue(email || "demo.google@jolotorongo.com"),
      name: requiredString(name || "Google Demo User", "নাম", 120),
    };
  }

  const normalizedPhone = phone ? normalizeIdentifier(requiredString(phone, "ফোন নম্বর", 40)) : undefined;
  let user = await User.findOne({
    $or: [{ email: profile.email }, { googleId: profile.googleId }],
  });

  if (!user) {
    user = await User.create({
      name: profile.name,
      email: profile.email,
      phone: normalizedPhone,
      role: normalizedRole,
      authProvider: "google",
      googleId: profile.googleId,
      isEmailVerified: true,
    });

    if (normalizedRole === "boat_owner") {
      await Houseboat.create({
        name: `${profile.name}-এর বোট`,
        ownerId: user._id,
        isOperational: false,
      });
    }
  } else {
    user.googleId = user.googleId || profile.googleId;
    user.isEmailVerified = true;
    if (normalizedPhone && !user.phone) user.phone = normalizedPhone;
    await user.save({ validateBeforeSave: false });
  }

  if (user.status === "suspended") {
    return next(new AppError("আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।", 403));
  }

  sendAuthResponse(user, 200, res, "Google লগইন সফল।");
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
  const normalizedPassword = requiredString(newPassword, "নতুন পাসওয়ার্ড", 200);
  if (normalizedPassword.length < 6) return next(new AppError("নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।", 400));

  user.password = normalizedPassword;
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
  requestOtp,
  confirmOtp,
  otpLogin,
  googleAuth,
  getMe,
  changePassword,
  getNotifications,
  markAllNotificationsRead,
};
