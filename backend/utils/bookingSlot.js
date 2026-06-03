const ACTIVE_BOOKING_STATUSES = ["on_hold", "confirmed"];

const startOfDay = (value) => {
  let date;
  if (value instanceof Date) {
    date = new Date(value);
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    const inputDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (inputDate) {
      date = new Date(Date.UTC(Number(inputDate[1]), Number(inputDate[2]) - 1, Number(inputDate[3])));
    } else {
      date = new Date(trimmed);
    }
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
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
