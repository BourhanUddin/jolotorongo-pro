const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema(
  {
    houseboatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Houseboat",
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
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
      default: null,
    },
    vesselName: { type: String, required: true },
    roomNumber: { type: String, required: true },
    roomType: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    grossRevenue: { type: Number, required: true },
    agentCommission: { type: Number, default: 0 },
    netRevenue: { type: Number, required: true },
    source: {
      type: String,
      enum: ["direct", "agent_request"],
      required: true,
    },
  },
  { timestamps: true }
);

ledgerSchema.index({ houseboatId: 1, checkIn: 1, checkOut: 1 });

module.exports = mongoose.model("Ledger", ledgerSchema);
