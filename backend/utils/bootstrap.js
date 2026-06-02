const User = require("../models/User");
const SubscriptionPlan = require("../models/SubscriptionPlan");

const DEFAULT_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "admin@jolotorongo.com";
const DEFAULT_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "Admin@1234";

const ensureDemoData = async () => {
  if (process.env.NODE_ENV === "production" || process.env.DISABLE_DEMO_BOOTSTRAP === "true") return;

  await User.syncIndexes();
  await SubscriptionPlan.syncIndexes();
  await SubscriptionPlan.bulkWrite([
    {
      updateOne: {
        filter: { name: "Basic" },
        update: {
          $setOnInsert: {
            name: "Basic",
            durationDays: 30,
            price: 500,
            description: "Small boat starter plan",
            features: ["10 rooms", "5 agents", "Manual payment approval"],
            maxRooms: 10,
            maxAgents: 5,
            isActive: true,
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { name: "Pro" },
        update: {
          $setOnInsert: {
            name: "Pro",
            durationDays: 90,
            price: 1200,
            description: "Growing houseboat operations",
            features: ["20 rooms", "15 agents", "Finance reports"],
            maxRooms: 20,
            maxAgents: 15,
            isActive: true,
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { name: "Annual" },
        update: {
          $setOnInsert: {
            name: "Annual",
            durationDays: 365,
            price: 4000,
            description: "Full year platform access",
            features: ["Unlimited rooms", "Unlimited agents", "Priority support"],
            maxRooms: 9999,
            maxAgents: 9999,
            isActive: true,
          },
        },
        upsert: true,
      },
    },
  ]);

  let admin = await User.findOne({ email: DEFAULT_ADMIN_EMAIL }).select("+password");
  if (!admin) {
    admin = await User.create({
      name: "সুপার অ্যাডমিন",
      email: DEFAULT_ADMIN_EMAIL,
      phone: "01700000000",
      password: DEFAULT_ADMIN_PASSWORD,
      role: "super_admin",
      status: "active",
      isApprovedByAdmin: true,
      isEmailVerified: true,
      isPhoneVerified: true,
    });
    console.log(`✅ Demo super admin ready: ${admin.email}`);
    return;
  }

  const passwordWorks = await admin.comparePassword(DEFAULT_ADMIN_PASSWORD);
  if (!passwordWorks) {
    admin.password = DEFAULT_ADMIN_PASSWORD;
    admin.status = "active";
    admin.isApprovedByAdmin = true;
    admin.isEmailVerified = true;
    await admin.save();
    console.log(`✅ Demo super admin password reset: ${admin.email}`);
  }
};

module.exports = { ensureDemoData };
