const mongoose = require("mongoose");

const houseboatSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, default: "Tanguar Haor" },
    logoUrl: { type: String, default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    holdTimeoutMinutes: { type: Number, default: 60 },

    // Derived from owner's subscription — duplicated here for fast query
    isOperational: { type: Boolean, default: false },

    // Agents who have been approved to work with this houseboat
    approvedAgents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Houseboat", houseboatSchema);
