const mongoose = require("mongoose");

const invoiceTemplateSchema = new mongoose.Schema(
  {
    houseboatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Houseboat",
      required: true,
      unique: true,
    },
    title: { type: String, default: "Jolotorongo Invoice" },
    businessName: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    paymentInstructions: { type: String, default: "" },
    terms: { type: String, default: "" },
    footerNote: { type: String, default: "Thank you for booking with us." },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InvoiceTemplate", invoiceTemplateSchema);
