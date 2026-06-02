const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    houseboatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Houseboat",
      required: true,
    },
    roomNumber: { type: String, required: true, trim: true },
    roomType: {
      type: String,
      enum: ["single", "double", "family", "vip", "dormitory"],
      default: "double",
    },
    acRoomPrice: { type: Number, required: true },
    nonAcRoomPrice: { type: Number, required: true },
    basePrice: { type: Number, required: true },
    extraPersonPrice: { type: Number, default: 0 },
    maxCapacity: { type: Number, default: 2 },
    description: { type: String, default: "" },
    amenities: [{ type: String }],
    services: [{ type: String }],
    images: [{ type: String }],
    availability: [
      {
        checkIn: { type: Date, required: true },
        checkOut: { type: Date, required: true },
        status: {
          type: String,
          enum: ["on_hold", "booked", "expired", "cancelled", "completed"],
          required: true,
        },
        bookingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Booking",
          default: null,
        },
        bookingRequestId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "BookingRequest",
          default: null,
        },
      },
    ],
    status: {
      type: String,
      enum: ["available", "on_hold", "booked", "maintenance"],
      default: "available",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique room number per houseboat
roomSchema.index({ houseboatId: 1, roomNumber: 1 }, { unique: true });

module.exports = mongoose.model("Room", roomSchema);
