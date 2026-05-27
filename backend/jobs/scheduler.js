const cron = require("node-cron");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const User = require("../models/User");
const Houseboat = require("../models/Houseboat");
const { pushNotification } = require("../utils/notification");
const { generateRenewalReminderLink } = require("../services/whatsapp.service");

// ─── Job 1: Auto-expire held bookings (every 5 minutes) ──────
const expireHeldBookings = cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();
    const expiredBookings = await Booking.find({
      status: "on_hold",
      expiresAt: { $lt: now },
    });

    if (expiredBookings.length === 0) return;

    const bookingIds = expiredBookings.map((b) => b._id);

    await Promise.all([
      Booking.updateMany({ _id: { $in: bookingIds } }, { status: "expired" }),
      Room.updateMany(
        { "availability.bookingId": { $in: bookingIds } },
        { $set: { "availability.$[slot].status": "expired" } },
        { arrayFilters: [{ "slot.bookingId": { $in: bookingIds } }] }
      ),
    ]);

    // Notify agents of expired holds
    for (const booking of expiredBookings) {
      await pushNotification(
        booking.agentId,
        `⏰ "${booking.customerName}" এর রুম হোল্ড সময় শেষ হয়েছে এবং স্বয়ংক্রিয়ভাবে বাতিল হয়েছে।`,
        "warning"
      );
    }

    console.log(`🕐 ${expiredBookings.length}টি হোল্ড মেয়াদ উত্তীর্ণ হয়েছে।`);
  } catch (err) {
    console.error("❌ Hold expiry cron error:", err.message);
  }
});

// ─── Job 2: Subscription expiry check (daily at 8 AM) ────────
const checkSubscriptionExpiry = cron.schedule("0 8 * * *", async () => {
  try {
    const now = new Date();

    // ── Mark expired subscriptions inactive ──
    const expired = await User.find({
      role: "boat_owner",
      "subscription.isActive": true,
      "subscription.endDate": { $lt: now },
    });

    for (const owner of expired) {
      owner.subscription.isActive = false;
      owner.status = "pending";
      await owner.save();
      await Houseboat.updateOne({ ownerId: owner._id }, { isOperational: false });
      await pushNotification(
        owner._id,
        "⚠️ আপনার সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে। বোটের কার্যক্রম বন্ধ আছে। দ্রুত রিনিউ করুন।",
        "error"
      );
    }

    // ── Send renewal alerts (5–7 days before expiry) ──
    const alertWindow = new Date();
    alertWindow.setDate(alertWindow.getDate() + 7);

    const nearExpiry = await User.find({
      role: "boat_owner",
      "subscription.isActive": true,
      "subscription.renewalAlertSent": false,
      "subscription.endDate": { $lte: alertWindow, $gte: now },
    });

    for (const owner of nearExpiry) {
      const daysLeft = Math.ceil(
        (new Date(owner.subscription.endDate) - now) / (1000 * 60 * 60 * 24)
      );
      const planName = owner.subscription.planName || "আপনার প্ল্যান";
      const waLink = generateRenewalReminderLink(owner.phone, daysLeft, planName);

      await pushNotification(
        owner._id,
        `⏳ আপনার "${planName}" সাবস্ক্রিপশন ${daysLeft} দিনের মধ্যে শেষ হবে। সময়মতো রিনিউ করুন।`,
        "warning"
      );

      // Mark alert sent so we don't spam
      owner.subscription.renewalAlertSent = true;
      await owner.save();

      console.log(`📩 Renewal reminder sent to: ${owner.email} | WhatsApp: ${waLink}`);
    }

    if (expired.length || nearExpiry.length) {
      console.log(
        `📅 সাবস্ক্রিপশন চেক: ${expired.length}টি মেয়াদ উত্তীর্ণ, ${nearExpiry.length}টি রিমাইন্ডার পাঠানো হয়েছে।`
      );
    }
  } catch (err) {
    console.error("❌ Subscription expiry cron error:", err.message);
  }
});

const startJobs = () => {
  expireHeldBookings.start();
  checkSubscriptionExpiry.start();
  console.log("⏱️  Cron jobs চালু হয়েছে (Hold expiry: ৫ মিনিট, Subscription: দৈনিক ৮টা)");
};

module.exports = { startJobs };
