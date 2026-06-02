const mongoose = require("mongoose");

const tourSchema = new mongoose.Schema(
  {
    houseboatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Houseboat",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    roomIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    }],
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "cancelled", "completed"],
      default: "scheduled",
    },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

tourSchema.index({ houseboatId: 1, checkIn: 1, checkOut: 1 });

module.exports = mongoose.model("Tour", tourSchema);
