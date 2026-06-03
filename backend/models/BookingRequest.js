const mongoose = require("mongoose");

const bookingRequestSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    boatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Houseboat",
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tripDates: {
      checkIn: { type: Date, required: true },
      checkOut: { type: Date, required: true },
    },
    guestCount: { type: Number, default: 1 },
    pricingMode: {
      type: String,
      enum: ["ac", "non_ac"],
      default: "ac",
    },
    basePrice: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    agentCommission: { type: Number, default: 0 },
    paymentConfirmedByAgent: { type: Boolean, default: false },
    paymentConfirmedAt: { type: Date, default: null },
    customerName: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    customerAddress: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    note: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: null },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
  },
  { timestamps: true }
);

bookingRequestSchema.index({ agentId: 1, boatId: 1, roomId: 1, status: 1 });
bookingRequestSchema.index({ boatId: 1, "tripDates.checkIn": 1, "tripDates.checkOut": 1 });

module.exports = mongoose.model("BookingRequest", bookingRequestSchema);
