const ACTIVE_BOOKING_STATUSES = ["on_hold", "confirmed"];

const startOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getTwoDaySlot = ({ checkIn, checkOut }) => {
  const normalizedCheckIn = startOfDay(checkIn);
  if (!normalizedCheckIn) return null;

  const expectedCheckOut = addDays(normalizedCheckIn, 1);
  const normalizedCheckOut = checkOut ? startOfDay(checkOut) : expectedCheckOut;
  if (!normalizedCheckOut) return null;

  const isTwoDayOneNight =
    normalizedCheckOut.getTime() === expectedCheckOut.getTime();

  if (!isTwoDayOneNight) {
    return { error: "শুধু ২ দিন ১ রাত (2D/1N) স্লট বুক করা যাবে।" };
  }

  return { checkIn: normalizedCheckIn, checkOut: normalizedCheckOut, nights: 1 };
};

const activeOverlapFilter = ({ roomId, checkIn, checkOut, excludeBookingId }) => {
  const now = new Date();
  const filter = {
    roomId,
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
    $or: [
      { status: "confirmed" },
      { status: "on_hold", $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
    ],
  };

  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }

  return filter;
};

module.exports = {
  ACTIVE_BOOKING_STATUSES,
  startOfDay,
  addDays,
  getTwoDaySlot,
  activeOverlapFilter,
};
