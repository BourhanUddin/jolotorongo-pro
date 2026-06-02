const Booking = require("../models/Booking");
const Room = require("../models/Room");

const expireStaleHolds = async () => {
  const now = new Date();
  const expired = await Booking.find({
    status: "on_hold",
    expiresAt: { $lt: now },
  }).select("_id");

  if (!expired.length) return 0;

  const ids = expired.map((booking) => booking._id);
  await Promise.all([
    Booking.updateMany({ _id: { $in: ids } }, { status: "expired" }),
    Room.updateMany(
      { "availability.bookingId": { $in: ids } },
      { $set: { "availability.$[slot].status": "expired" } },
      { arrayFilters: [{ "slot.bookingId": { $in: ids } }] }
    ),
  ]);

  return ids.length;
};

module.exports = { expireStaleHolds };
