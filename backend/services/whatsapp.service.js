/**
 * Generate a wa.me deep-link for booking confirmations & invoices.
 * No API key needed — uses WhatsApp web deep-link format.
 */

const generateBookingConfirmationLink = (booking, roomNumber, houseboatName) => {
  const checkIn = new Date(booking.checkIn).toLocaleDateString("bn-BD");
  const checkOut = new Date(booking.checkOut).toLocaleDateString("bn-BD");

  const message =
    `🛥️ *${houseboatName}* — বুকিং কনফার্মেশন\n\n` +
    `👤 নাম: ${booking.customerName}\n` +
    `📞 ফোন: ${booking.customerPhone}\n` +
    `🛏️ রুম: ${roomNumber}\n` +
    `📅 চেক-ইন: ${checkIn}\n` +
    `📅 চেক-আউট: ${checkOut}\n` +
    `🌙 প্যাকেজ: ২ দিন ১ রাত\n` +
    `👥 অতিথি: ${booking.guestCount} জন\n` +
    `💵 মোট: ৳${booking.totalPrice}\n` +
    `✅ অগ্রিম: ৳${booking.advancePaid}\n` +
    `⏳ বাকি: ৳${booking.dueAmount}\n\n` +
    `ধন্যবাদ! আপনার সুন্দর যাত্রা কামনা করছি। 🌿`;

  const encoded = encodeURIComponent(message);
  const phone = booking.customerPhone.replace(/[^0-9]/g, "");
  const intlPhone = phone.startsWith("0") ? "88" + phone : phone;

  return `https://wa.me/${intlPhone}?text=${encoded}`;
};

const generateRenewalReminderLink = (ownerPhone, daysLeft, planName) => {
  const message =
    `⚠️ *Jolotorongo সাবস্ক্রিপশন রিমাইন্ডার*\n\n` +
    `আপনার "${planName}" প্ল্যানের মেয়াদ মাত্র *${daysLeft} দিন* বাকি আছে।\n\n` +
    `দ্রুত রিনিউ করুন যাতে আপনার বোটের অপারেশন চালু থাকে।\n\n` +
    `🔗 লগইন করুন এবং রিনিউ করুন: ${process.env.FRONTEND_URL}/subscription`;

  const encoded = encodeURIComponent(message);
  const phone = ownerPhone.replace(/[^0-9]/g, "");
  const intlPhone = phone.startsWith("0") ? "88" + phone : phone;

  return `https://wa.me/${intlPhone}?text=${encoded}`;
};

module.exports = { generateBookingConfirmationLink, generateRenewalReminderLink };
