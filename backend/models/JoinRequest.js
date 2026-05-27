const mongoose = require("mongoose");

// An agent (after being verified by super_admin) can send a "Request to Join"
// to a boat_owner. The boat_owner (or their admin-level staff) approves/rejects.

const joinRequestSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    houseboatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Houseboat",
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    message: { type: String, default: "" },            // Optional note from agent
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: null },       // Reason for rejection etc.
  },
  { timestamps: true }
);

// Prevent duplicate pending requests
joinRequestSchema.index({ agentId: 1, houseboatId: 1 }, { unique: true });

module.exports = mongoose.model("JoinRequest", joinRequestSchema);
