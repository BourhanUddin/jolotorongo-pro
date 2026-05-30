const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "নাম দিতে হবে"], trim: true },
    email: { type: String, required: [true, "ইমেইল দিতে হবে"], unique: true, lowercase: true, trim: true },
    phone: { type: String, required: [true, "ফোন নম্বর দিতে হবে"], trim: true },
    password: { type: String, required: [true, "পাসওয়ার্ড দিতে হবে"], minlength: 6, select: false },

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
        enum: ["bkash", "nagad", "rocket", "bank", "cash", null],
        default: null,
      },
      paymentStatus: {
        type: String,
        enum: ["unpaid", "pending_approval", "paid", "failed"],
        default: "unpaid",
      },
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
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password helper
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Auto-set status based on role at creation
userSchema.pre("validate", function (next) {
  if (this.isNew) {
    if (this.role === "boat_owner") this.status = "pending";
    else if (this.role === "manager") this.status = "active";
    else if (this.role === "agent") this.status = "unverified";
    else if (this.role === "super_admin") this.status = "active";
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
