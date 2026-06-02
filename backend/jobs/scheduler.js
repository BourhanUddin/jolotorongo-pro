const cron = require("node-cron");
const Booking = require("../models/Booking");
const { pushNotification } = require("../utils/notification");
const { expireStaleHolds } = require("../utils/holdExpiry");

// ─── Job 1: Auto-expire held bookings (every 5 minutes) ──────
const expireHeldBookings = cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();
    const expiredBookings = await Booking.find({
      status: "on_hold",
      expiresAt: { $lt: now },
    });

    if (expiredBookings.length === 0) return;
    await expireStaleHolds();

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

const startJobs = () => {
  expireHeldBookings.start();
  console.log("⏱️  Cron jobs চালু হয়েছে (Hold expiry: ৫ মিনিট)");
};

module.exports = { startJobs };
