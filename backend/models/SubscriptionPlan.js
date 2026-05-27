const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },       // e.g. "Basic", "Pro", "Annual"
    durationDays: { type: Number, required: true },            // e.g. 30, 90, 365
    price: { type: Number, required: true },                   // BDT
    description: { type: String, default: "" },
    features: [{ type: String }],                             // List of included features
    isActive: { type: Boolean, default: true },               // Super admin can disable a plan
    maxRooms: { type: Number, default: 20 },                  // Room limit per plan
    maxAgents: { type: Number, default: 10 },                 // Agent limit per plan
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
