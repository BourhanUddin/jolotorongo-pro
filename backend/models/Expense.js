const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    houseboatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Houseboat",
      required: true,
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      enum: ["fuel", "food", "repair", "salary", "utility", "marketing", "other"],
      default: "other",
    },
    note: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    receiptUrl: { type: String, default: null },
  },
  { timestamps: true }
);

expenseSchema.index({ houseboatId: 1, date: -1 });

module.exports = mongoose.model("Expense", expenseSchema);
