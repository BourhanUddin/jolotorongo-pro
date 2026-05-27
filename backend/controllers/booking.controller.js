const Booking = require("../models/Booking");
const Room = require("../models/Room");
const Houseboat = require("../models/Houseboat");
const { AppError, catchAsync } = require("../utils/appError");
const { generateBookingConfirmationLink } = require("../services/whatsapp.service");
const { getTwoDaySlot, activeOverlapFilter, addDays, startOfDay } = require("../utils/bookingSlot");

// ─── Helper ───────────────────────────────────────────────────
const assertRoomBelongsToHouseboat = async (roomId, houseboatId, next) => {
  const room = await Room.findById(roomId);
  if (!room) return next(new AppError("রুম পাওয়া যায়নি।", 404));
  if (String(room.houseboatId) !== String(houseboatId)) {
    return next(new AppError("রুমটি এই হাউসবোটের নয়।", 403));
  }
  return room;
};

const findOverlappingBooking = ({ roomId, checkIn, checkOut, excludeBookingId }) =>
  Booking.findOne(activeOverlapFilter({ roomId, checkIn, checkOut, excludeBookingId }))
    .select("status expiresAt checkIn checkOut customerName");

// ──────────────────────────────────────────────────────────────
// AGENT — Place a Hold
// ──────────────────────────────────────────────────────────────

// POST /api/bookings/hold
const placeHold = catchAsync(async (req, res, next) => {
  const agent = req.user;
  const {
    roomId, customerName, customerPhone, customerAddress,
    checkIn, checkOut, guestCount, advancePaid, note,
  } = req.body;

  if (!agent.joinedHouseboatId) {
    return next(new AppError("আপনি কোনো হাউসবোটে যুক্ত নন।", 403));
  }

  const houseboat = await Houseboat.findById(agent.joinedHouseboatId);
  if (!houseboat || !houseboat.isOperational) {
    return next(new AppError("হাউসবোট এখন সক্রিয় নয়।", 403));
  }

  const room = await assertRoomBelongsToHouseboat(roomId, houseboat._id, next);
  if (!room) return;

  if (!room.isActive || room.status === "maintenance") {
    return next(new AppError("রুমটি এখন বুকিংয়ের জন্য সক্রিয় নয়।", 400));
  }

  const slot = getTwoDaySlot({ checkIn, checkOut });
  if (!slot) return next(new AppError("চেক-ইন তারিখ দিন।", 400));
  if (slot.error) return next(new AppError(slot.error, 400));

  const overlapping = await findOverlappingBooking({
    roomId,
    checkIn: slot.checkIn,
    checkOut: slot.checkOut,
  });
  if (overlapping) {
    return next(new AppError("এই ২ দিন ১ রাত স্লটে রুমটি উপলব্ধ নয়।", 409));
  }

  const numNights = 1;
  const numGuests = guestCount || 1;
  const extraCharge = Math.max(0, numGuests - room.maxCapacity) * room.extraPersonPrice;
  const basePrice = room.basePrice * numNights;
  const totalPrice = basePrice + extraCharge;

  const holdMinutes = houseboat.holdTimeoutMinutes || 60;
  const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

  const booking = await Booking.create({
    houseboatId: houseboat._id,
    roomId,
    agentId: agent._id,
    customerName,
    customerPhone,
    customerAddress: customerAddress || "",
    guestCount: numGuests,
    checkIn: slot.checkIn,
    checkOut: slot.checkOut,
    nights: numNights,
    basePrice,
    extraCharge,
    totalPrice,
    advancePaid: advancePaid || 0,
    status: "on_hold",
    expiresAt,
    note: note || "",
    paymentMethod: "pending",
  });

  await Room.findByIdAndUpdate(roomId, {
    $push: {
      availability: {
        checkIn: slot.checkIn,
        checkOut: slot.checkOut,
        status: "on_hold",
        bookingId: booking._id,
      },
    },
  });

  res.status(201).json({
    success: true,
    message: `রুম হোল্ড করা হয়েছে। ${holdMinutes} মিনিটের মধ্যে কনফার্ম করুন।`,
    data: { booking },
  });
});

// ──────────────────────────────────────────────────────────────
// BOAT OWNER — Confirm / Cancel / Complete
// ──────────────────────────────────────────────────────────────

// PATCH /api/bookings/:id/confirm
const confirmBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id).populate("roomId");
  if (!booking) return next(new AppError("বুকিং পাওয়া যায়নি।", 404));
  if (!["on_hold", "pending"].includes(booking.status)) {
    return next(new AppError("শুধুমাত্র হোল্ড বা পেন্ডিং বুকিং কনফার্ম করা যাবে।", 400));
  }

  const houseboat = await Houseboat.findOne({ ownerId: req.user._id });
  if (!houseboat || String(booking.houseboatId) !== String(houseboat._id)) {
    return next(new AppError("এই বুকিং অনুমোদনের অধিকার আপনার নেই।", 403));
  }

  const { paymentMethod, advancePaid } = req.body;

  const overlapping = await findOverlappingBooking({
    roomId: booking.roomId._id || booking.roomId,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    excludeBookingId: booking._id,
  });
  if (overlapping) {
    return next(new AppError("এই স্লটে আরেকটি সক্রিয় বুকিং আছে। কনফার্ম করা যাবে না।", 409));
  }

  booking.status = "confirmed";
  booking.approvedById = req.user._id;
  booking.expiresAt = null;
  if (paymentMethod) booking.paymentMethod = paymentMethod;
  if (advancePaid !== undefined) booking.advancePaid = advancePaid;
  await booking.save();

  await Room.updateOne(
    { _id: booking.roomId._id || booking.roomId, "availability.bookingId": booking._id },
    { $set: { "availability.$.status": "booked" } }
  );

  // Build WhatsApp confirmation link
  const whatsappLink = generateBookingConfirmationLink(
    booking,
    booking.roomId?.roomNumber || "—",
    houseboat.name
  );

  res.status(200).json({
    success: true,
    message: "বুকিং কনফার্ম হয়েছে।",
    data: { booking, whatsappLink },
  });
});

// PATCH /api/bookings/:id/cancel
const cancelBooking = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError("বুকিং পাওয়া যায়নি।", 404));
  if (["cancelled", "expired", "completed"].includes(booking.status)) {
    return next(new AppError("এই বুকিং আর বাতিল করা যাবে না।", 400));
  }

  booking.status = "cancelled";
  booking.cancelReason = reason || "";
  await booking.save();

  await Room.updateOne(
    { _id: booking.roomId, "availability.bookingId": booking._id },
    { $set: { "availability.$.status": "cancelled" } }
  );

  res.status(200).json({ success: true, message: "বুকিং বাতিল করা হয়েছে।" });
});

// PATCH /api/bookings/:id/complete
const completeBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError("বুকিং পাওয়া যায়নি।", 404));
  if (booking.status !== "confirmed") {
    return next(new AppError("শুধুমাত্র কনফার্মড বুকিং সম্পন্ন করা যাবে।", 400));
  }

  booking.status = "completed";
  await booking.save();
  await Room.updateOne(
    { _id: booking.roomId, "availability.bookingId": booking._id },
    { $set: { "availability.$.status": "completed" } }
  );

  res.status(200).json({ success: true, message: "বুকিং সম্পন্ন হিসেবে চিহ্নিত।" });
});

// ──────────────────────────────────────────────────────────────
// LIST / DETAIL
// ──────────────────────────────────────────────────────────────

// GET /api/bookings
const getBookings = catchAsync(async (req, res) => {
  const user = req.user;
  const { status, date, from, to, page = 1, limit = 20 } = req.query;

  let filter = {};

  if (user.role === "agent") {
    filter.agentId = user._id;
  } else if (user.role === "boat_owner") {
    const houseboat = await Houseboat.findOne({ ownerId: user._id });
    if (houseboat) filter.houseboatId = houseboat._id;
  }

  if (status) filter.status = status;
  if (date) {
    const d = startOfDay(date);
    const next = addDays(d, 1);
    filter.checkIn = { $lt: next };
    filter.checkOut = { $gt: d };
  } else if (from || to) {
    const rangeStart = from ? startOfDay(from) : new Date(0);
    const rangeEnd = to ? addDays(startOfDay(to), 1) : new Date("9999-12-31");
    filter.checkIn = { $lt: rangeEnd };
    filter.checkOut = { $gt: rangeStart };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("roomId", "roomNumber roomType")
      .populate("agentId", "name phone")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { total, page: Number(page), pages: Math.ceil(total / limit), bookings },
  });
});

// GET /api/bookings/manifest?from=&to=
const getManifest = catchAsync(async (req, res, next) => {
  const user = req.user;
  const { from, to } = req.query;
  const rangeStart = startOfDay(from || new Date());
  const rangeEnd = to ? addDays(startOfDay(to), 1) : addDays(rangeStart, 14);

  let houseboatId = null;
  if (user.role === "boat_owner") {
    const houseboat = await Houseboat.findOne({ ownerId: user._id });
    if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));
    houseboatId = houseboat._id;
  } else if (user.role === "agent") {
    houseboatId = user.joinedHouseboatId;
  }

  if (!houseboatId && user.role !== "super_admin") {
    return next(new AppError("ম্যানিফেস্ট দেখার অনুমতি নেই।", 403));
  }

  const roomFilter = houseboatId ? { houseboatId, isActive: true } : { isActive: true };
  const bookingFilter = {
    status: { $in: ["on_hold", "confirmed", "completed"] },
    checkIn: { $lt: rangeEnd },
    checkOut: { $gt: rangeStart },
  };
  if (houseboatId) bookingFilter.houseboatId = houseboatId;

  const [rooms, bookings] = await Promise.all([
    Room.find(roomFilter).sort("roomNumber"),
    Booking.find(bookingFilter)
      .populate("roomId", "roomNumber roomType")
      .populate("agentId", "name phone")
      .sort("checkIn"),
  ]);

  const rotations = [];
  for (let cursor = new Date(rangeStart); cursor < rangeEnd; cursor = addDays(cursor, 1)) {
    rotations.push({
      checkIn: new Date(cursor),
      checkOut: addDays(cursor, 1),
    });
  }

  const rows = rooms.map((room) => ({
    room,
    allocations: rotations.map((rotation) => {
      const booking = bookings.find((b) =>
        String(b.roomId?._id || b.roomId) === String(room._id) &&
        b.checkIn < rotation.checkOut &&
        b.checkOut > rotation.checkIn
      );
      return {
        ...rotation,
        state: booking
          ? booking.status === "on_hold" ? "on_hold" : "booked"
          : room.status === "maintenance" ? "maintenance" : "available",
        booking: booking || null,
      };
    }),
  }));

  res.status(200).json({
    success: true,
    data: { from: rangeStart, to: rangeEnd, rotations, rows },
  });
});

// GET /api/bookings/:id
const getBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate("roomId", "roomNumber roomType basePrice")
    .populate("agentId", "name phone email")
    .populate("approvedById", "name")
    .populate("houseboatId", "name location");

  if (!booking) return next(new AppError("বুকিং পাওয়া যায়নি।", 404));

  const houseboat = await Houseboat.findById(booking.houseboatId);
  const whatsappLink =
    booking.status === "confirmed"
      ? generateBookingConfirmationLink(
          booking,
          booking.roomId?.roomNumber || "—",
          houseboat?.name || ""
        )
      : null;

  res.status(200).json({ success: true, data: { booking, whatsappLink } });
});

module.exports = {
  placeHold, confirmBooking, cancelBooking, completeBooking, getBookings, getBooking, getManifest,
};
