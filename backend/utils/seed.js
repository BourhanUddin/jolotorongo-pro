require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const { connectDB } = require("../config/db");

const seed = async () => {
  await connectDB();

  // ─── Subscription Plans ──────────────────────────────────
  await SubscriptionPlan.deleteMany({});
  const plans = await SubscriptionPlan.insertMany([
    {
      name: "বেসিক",
      durationDays: 30,
      price: 500,
      description: "১ মাসের জন্য বেসিক প্ল্যান",
      features: ["সর্বোচ্চ ১০টি রুম", "সর্বোচ্চ ৫ জন এজেন্ট", "হোয়াটসঅ্যাপ ইনভয়েস"],
      maxRooms: 10,
      maxAgents: 5,
    },
    {
      name: "প্রো",
      durationDays: 90,
      price: 1200,
      description: "৩ মাসের জন্য প্রো প্ল্যান",
      features: ["সর্বোচ্চ ২০টি রুম", "সর্বোচ্চ ১৫ জন এজেন্ট", "হোয়াটসঅ্যাপ ইনভয়েস", "ফাইন্যান্স রিপোর্ট"],
      maxRooms: 20,
      maxAgents: 15,
    },
    {
      name: "বার্ষিক",
      durationDays: 365,
      price: 4000,
      description: "১ বছরের জন্য সর্বোচ্চ সুবিধা",
      features: [
        "সীমাহীন রুম",
        "সীমাহীন এজেন্ট",
        "হোয়াটসঅ্যাপ ইনভয়েস",
        "ফাইন্যান্স রিপোর্ট",
        "প্রিয়রিটি সাপোর্ট",
      ],
      maxRooms: 9999,
      maxAgents: 9999,
    },
  ]);
  console.log("✅ সাবস্ক্রিপশন প্ল্যান তৈরি হয়েছে:", plans.map((p) => p.name).join(", "));

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
  });
  console.log("✅ সুপার অ্যাডমিন তৈরি হয়েছে:", superAdmin.email);

  mongoose.disconnect();
  console.log("\n🌱 Seed সম্পন্ন হয়েছে।");
};

seed().catch((err) => {
  console.error("❌ Seed ব্যর্থ:", err);
  process.exit(1);
});