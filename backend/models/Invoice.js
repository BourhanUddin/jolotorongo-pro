const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
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
    invoiceNo: { type: String, required: true, unique: true },
    items: [invoiceItemSchema],
    status: { type: String, enum: ["draft", "final", "void"], default: "final" },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    agentCommission: { type: Number, default: 0 },
    netRevenue: { type: Number, required: true },
    total: { type: Number, required: true },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

invoiceSchema.index({ houseboatId: 1, issuedAt: -1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
