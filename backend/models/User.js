const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "নাম দিতে হবে"], trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    password: {
      type: String,
      required: function () { return this.authProvider === "password"; },
      minlength: 6,
      select: false,
    },
    authProvider: { type: String, enum: ["password", "google"], default: "password" },
    googleId: { type: String, unique: true, sparse: true, trim: true },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },

    // ─── Role ───────────────────────────────────────────────
    role: {
      type: String,
      enum: ["super_admin", "boat_owner", "manager", "agent"],
      default: "agent",
    },

    // ─── Account Status ─────────────────────────────────────
    // boat_owner lifecycle:  pending → active | suspended
    // agent lifecycle:       unverified → verified | suspended
    status: {
      type: String,
      enum: ["unverified", "pending", "active", "suspended"],
      default: "unverified",
    },

    isApprovedByAdmin: { type: Boolean, default: false },

    // ─── Subscription (boat_owner only) ─────────────────────
    subscription: {
      planId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", default: null },
      planName: { type: String, default: null },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
      isActive: { type: Boolean, default: false },
      paymentReference: { type: String, default: null },
      paymentMethod: {
        type: String,
        enum: ["bkash", "nagad", "rocket", "bank", "card", "cash", "demo_card", null],
        default: null,
      },
      paymentStatus: {
        type: String,
        enum: ["unpaid", "pending_approval", "paid", "failed"],
        default: "unpaid",
      },
      senderNumber: { type: String, default: null },
      paymentScreenshotUrl: { type: String, default: null },
      paymentNote: { type: String, default: null },
      rejectionReason: { type: String, default: null },
      renewalAlertSent: { type: Boolean, default: false },
    },

    // ─── Agent: which houseboat they joined ─────────────────
    joinedHouseboatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Houseboat",
      default: null,
    },

    // ─── In-app notifications ────────────────────────────────
    notifications: [
      {
        message: String,
        type: { type: String, enum: ["info", "warning", "success", "error"], default: "info" },
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password helper
userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// Auto-set status based on role at creation
userSchema.pre("validate", function (next) {
  if (!this.email && !this.phone) {
    this.invalidate("email", "ইমেইল বা ফোন নম্বর দিতে হবে");
  }
  if (this.isNew) {
    if (this.role === "boat_owner") this.status = "pending";
    else if (this.role === "manager") this.status = "active";
    else if (this.role === "agent") this.status = "unverified";
    else if (this.role === "super_admin") this.status = "active";
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
