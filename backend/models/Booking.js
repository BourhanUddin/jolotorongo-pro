const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    houseboatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Houseboat",
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Customer info (external — no account needed)
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerAddress: { type: String, default: "" },
    guestCount: { type: Number, default: 1 },

    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, default: 1 },

    basePrice: { type: Number, required: true },
    extraCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    advancePaid: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["on_hold", "confirmed", "cancelled", "expired", "completed"],
      default: "on_hold",
    },

    // Auto-release timer for holds
    expiresAt: { type: Date, default: null },

    paymentMethod: {
      type: String,
      enum: ["cash", "bkash", "nagad", "rocket", "bank", "pending"],
      default: "pending",
    },

    note: { type: String, default: "" },
    invoiceSentAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },
  },
  { timestamps: true }
);

// Index for fast hold-expiry cron queries
bookingSchema.index({ status: 1, expiresAt: 1 });
bookingSchema.index({ houseboatId: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ roomId: 1, checkIn: 1, checkOut: 1, status: 1 });

// Auto-calculate dueAmount before save
bookingSchema.pre("save", function (next) {
  this.dueAmount = this.totalPrice - this.advancePaid;
  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
