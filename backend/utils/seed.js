require("./env").loadEnv();
const mongoose = require("mongoose");
const User = require("../models/User");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const { connectDB } = require("../config/db");

const seed = async () => {
  await connectDB();

  await SubscriptionPlan.deleteMany({});
  await SubscriptionPlan.insertMany([
    {
      name: "Basic",
      durationDays: 30,
      price: 500,
      description: "Small boat starter plan",
      features: ["10 rooms", "5 agents", "Manual payment approval"],
      maxRooms: 10,
      maxAgents: 5,
    },
    {
      name: "Pro",
      durationDays: 90,
      price: 1200,
      description: "Growing houseboat operations",
      features: ["20 rooms", "15 agents", "Finance reports"],
      maxRooms: 20,
      maxAgents: 15,
    },
    {
      name: "Annual",
      durationDays: 365,
      price: 4000,
      description: "Full year platform access",
      features: ["Unlimited rooms", "Unlimited agents", "Priority support"],
      maxRooms: 9999,
      maxAgents: 9999,
    },
  ]);

  // ─── Super Admin ─────────────────────────────────────────
  await User.deleteOne({ email: "admin@jolotorongo.com" });
  const superAdmin = await User.create({
    name: "সুপার অ্যাডমিন",
    email: "admin@jolotorongo.com",
    phone: "01700000000",
    password: "Admin@1234",
    role: "super_admin",
    status: "active",
    isApprovedByAdmin: true,
    isEmailVerified: true,
    isPhoneVerified: true,
  });
  console.log("✅ সুপার অ্যাডমিন তৈরি হয়েছে:", superAdmin.email);

  mongoose.disconnect();
  console.log("\n🌱 Seed সম্পন্ন হয়েছে।");
};

seed().catch((err) => {
  console.error("❌ Seed ব্যর্থ:", err);
  process.exit(1);
});
