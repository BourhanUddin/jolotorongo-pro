const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const Houseboat = require("../models/Houseboat");
const { AppError, catchAsync } = require("../utils/appError");
const { generateBookingConfirmationLink } = require("../services/whatsapp.service");
const { getTwoDaySlot, activeOverlapFilter, addDays, startOfDay } = require("../utils/bookingSlot");
const { expireStaleHolds } = require("../utils/holdExpiry");
const { reserveRoomSlot, releaseRoomSlot } = require("../utils/roomSlotReservation");
const { recordBookingRevenue } = require("../utils/revenueLedger");
const {
  requiredString,
  optionalString,
  numberValue,
  optionalNumber,
  objectId,
  enumValue,
} = require("../utils/validation");

// ─── Helper ───────────────────────────────────────────────────
const assertRoomBelongsToHouseboat = async (roomId, houseboatId, next) => {
  objectId(roomId, "রুম আইডি");
  const room = await Room.findById(roomId);
  if (!room) return next(new AppError("রুম পাওয়া যায়নি।", 404));
  if (String(room.houseboatId) !== String(houseboatId)) {
    return next(new AppError("রুমটি এই হাউসবোটের নয়।", 403));
  }
  return room;
};

const getManagedHouseboat = async (user) => {
  if (user.role === "boat_owner") return Houseboat.findOne({ ownerId: user._id });
  if (user.role === "manager" && user.joinedHouseboatId) return Houseboat.findById(user.joinedHouseboatId);
  if (user.role === "agent") return Houseboat.findById(user.joinedHouseboatId);
  return null;
};

const findOverlappingBooking = ({ roomId, checkIn, checkOut, excludeBookingId }) =>
  Booking.findOne(activeOverlapFilter({ roomId, checkIn, checkOut, excludeBookingId }))
    .select("status expiresAt checkIn checkOut customerName");

const resolveRoomPrice = (room, requestedMode) => {
  const pricingMode = requestedMode
    ? enumValue(requestedMode, ["ac", "non_ac"], "রুম মূল্য ধরন")
    : "ac";
  const fallbackPrice = room.basePrice || room.acRoomPrice || room.nonAcRoomPrice || 0;
  const basePrice = pricingMode === "non_ac"
    ? room.nonAcRoomPrice ?? fallbackPrice
    : room.acRoomPrice ?? fallbackPrice;
  return { pricingMode, basePrice };
};

const assertBookingAccess = async (user, booking, next) => {
  if (user.role === "super_admin") return true;
  if (user.role === "agent") {
    if (String(booking.agentId?._id || booking.agentId) === String(user._id)) return true;
    return next(new AppError("এই বুকিং দেখার অনুমতি নেই।", 403));
  }

  if (["boat_owner", "manager"].includes(user.role)) {
    const houseboat = await getManagedHouseboat(user);
    if (houseboat && String(booking.houseboatId?._id || booking.houseboatId) === String(houseboat._id)) {
      return true;
    }
  }

  return next(new AppError("এই বুকিংয়ের অনুমতি নেই।", 403));
};

// ──────────────────────────────────────────────────────────────
// AGENT — Place a Hold
// ──────────────────────────────────────────────────────────────

// POST /api/bookings/hold
const placeHold = catchAsync(async (req, res, next) => {
  return next(new AppError("এজেন্ট সরাসরি রুম হোল্ড করতে পারবেন না। বুকিং রিকোয়েস্ট পাঠান।", 403));
  const agent = req.user;
  const {
    roomId, customerName, customerPhone, customerAddress,
    checkIn, checkOut, guestCount, advancePaid, note, tourName, pricingMode,
  } = req.body;
  objectId(roomId, "রুম আইডি");

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
  const numGuests = optionalNumber(guestCount, "অতিথি সংখ্যা", { min: 1, max: 100, integer: true }) ?? 1;
  const extraCharge = Math.max(0, numGuests - room.maxCapacity) * room.extraPersonPrice;
  const resolvedPrice = resolveRoomPrice(room, pricingMode);
  const basePrice = resolvedPrice.basePrice * numNights;
  const totalPrice = basePrice + extraCharge;

  const holdMinutes = houseboat.holdTimeoutMinutes || 60;
  const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

  const bookingId = new mongoose.Types.ObjectId();
  const reserved = await reserveRoomSlot({
    roomId,
    checkIn: slot.checkIn,
    checkOut: slot.checkOut,
    status: "on_hold",
    bookingId,
  });
  if (!reserved) {
    return next(new AppError("এই ২ দিন ১ রাত স্লটে রুমটি উপলব্ধ নয়।", 409));
  }

  const booking = new Booking({
    _id: bookingId,
    houseboatId: houseboat._id,
    roomId,
    agentId: agent._id,
    customerName: requiredString(customerName, "গ্রাহকের নাম", 120),
    customerPhone: requiredString(customerPhone, "গ্রাহকের ফোন", 40),
    customerAddress: optionalString(customerAddress, 300),
    guestCount: numGuests,
    checkIn: slot.checkIn,
    checkOut: slot.checkOut,
    nights: numNights,
    tourName: optionalString(tourName || note, 160),
    pricingMode: resolvedPrice.pricingMode,
    basePrice,
    extraCharge,
    totalPrice,
    advancePaid: optionalNumber(advancePaid, "অগ্রিম", { min: 0 }) ?? 0,
    status: "on_hold",
    expiresAt,
    note: optionalString(note, 1000),
    paymentMethod: "pending",
  });

  try {
    await booking.save();
  } catch (error) {
    await releaseRoomSlot({ roomId, bookingId });
    throw error;
  }

  res.status(201).json({
    success: true,
    message: `রুম হোল্ড করা হয়েছে। ${holdMinutes} মিনিটের মধ্যে কনফার্ম করুন।`,
    data: { booking },
  });
});

// ──────────────────────────────────────────────────────────────
// BOAT OWNER — Confirm / Cancel / Complete
// ──────────────────────────────────────────────────────────────

// POST /api/bookings/direct
const createDirectBooking = catchAsync(async (req, res, next) => {
  const {
    roomId, customerName, customerPhone, customerAddress,
    checkIn, checkOut, guestCount, advancePaid, paymentMethod, note, tourName, pricingMode, referenceName,
  } = req.body;
  objectId(roomId, "রুম আইডি");

  const houseboat = await getManagedHouseboat(req.user);
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

  const numGuests = optionalNumber(guestCount, "অতিথি সংখ্যা", { min: 1, max: 100, integer: true }) ?? 1;
  const extraCharge = Math.max(0, numGuests - room.maxCapacity) * room.extraPersonPrice;
  const resolvedPrice = resolveRoomPrice(room, pricingMode);
  const basePrice = resolvedPrice.basePrice;
  const totalPrice = basePrice + extraCharge;

  const bookingId = new mongoose.Types.ObjectId();
  const reserved = await reserveRoomSlot({
    roomId,
    checkIn: slot.checkIn,
    checkOut: slot.checkOut,
    status: "booked",
    bookingId,
  });
  if (!reserved) {
    return next(new AppError("এই ২ দিন ১ রাত স্লটে রুমটি উপলব্ধ নয়।", 409));
  }

  const booking = new Booking({
    _id: bookingId,
    houseboatId: houseboat._id,
    roomId,
    agentId: req.user._id,
    approvedById: req.user._id,
    customerName: requiredString(customerName, "গ্রাহকের নাম", 120),
    customerPhone: requiredString(customerPhone, "গ্রাহকের ফোন", 40),
    customerAddress: optionalString(customerAddress, 300),
    referenceName: requiredString(referenceName, "রেফারেন্স নাম", 120),
    guestCount: numGuests,
    checkIn: slot.checkIn,
    checkOut: slot.checkOut,
    nights: 1,
    tourName: optionalString(tourName || note, 160),
    pricingMode: resolvedPrice.pricingMode,
    basePrice,
    extraCharge,
    totalPrice,
    advancePaid: optionalNumber(advancePaid, "অগ্রিম", { min: 0 }) ?? 0,
    status: "confirmed",
    expiresAt: null,
    note: optionalString(note, 1000),
    paymentMethod: paymentMethod ? enumValue(paymentMethod, ["cash", "bkash", "nagad", "rocket", "bank", "pending"], "পেমেন্ট পদ্ধতি") : "cash",
  });

  try {
    await booking.save();
  } catch (error) {
    await releaseRoomSlot({ roomId, bookingId });
    throw error;
  }

  await recordBookingRevenue({
    booking,
    room,
    houseboat,
    source: "direct",
    agentCommission: 0,
  });

  const whatsappLink = generateBookingConfirmationLink(booking, room.roomNumber, houseboat.name);

  res.status(201).json({
    success: true,
    message: "ডাইরেক্ট বুকিং কনফার্ম হয়েছে।",
    data: { booking, whatsappLink },
  });
});

// PATCH /api/bookings/:id/confirm
const confirmBooking = catchAsync(async (req, res, next) => {
  objectId(req.params.id, "বুকিং আইডি");
  const booking = await Booking.findById(req.params.id).populate("roomId");
  if (!booking) return next(new AppError("বুকিং পাওয়া যায়নি।", 404));
  if (!["on_hold", "pending"].includes(booking.status)) {
    return next(new AppError("শুধুমাত্র হোল্ড বা পেন্ডিং বুকিং কনফার্ম করা যাবে।", 400));
  }

  const houseboat = await getManagedHouseboat(req.user);
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
  if (req.body.referenceName !== undefined) booking.referenceName = requiredString(req.body.referenceName, "রেফারেন্স নাম", 120);
  if (paymentMethod) booking.paymentMethod = enumValue(paymentMethod, ["cash", "bkash", "nagad", "rocket", "bank", "pending"], "পেমেন্ট পদ্ধতি");
  if (advancePaid !== undefined) booking.advancePaid = numberValue(advancePaid, "অগ্রিম", { min: 0 });
  await booking.save();

  await Room.updateOne(
    { _id: booking.roomId._id || booking.roomId, "availability.bookingId": booking._id },
    { $set: { "availability.$.status": "booked" } }
  );

  await recordBookingRevenue({
    booking,
    room: booking.roomId,
    houseboat,
    source: "direct",
    agentCommission: booking.agentCommission || 0,
  });

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
  objectId(req.params.id, "বুকিং আইডি");
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError("বুকিং পাওয়া যায়নি।", 404));
  const allowed = await assertBookingAccess(req.user, booking, next);
  if (!allowed) return;
  if (req.user.role === "agent" && booking.status !== "on_hold") {
    return next(new AppError("এজেন্ট শুধু নিজের হোল্ড বাতিল করতে পারবেন।", 403));
  }
  if (["cancelled", "expired", "completed"].includes(booking.status)) {
    return next(new AppError("এই বুকিং আর বাতিল করা যাবে না।", 400));
  }

  booking.status = "cancelled";
  booking.cancelReason = optionalString(reason, 500);
  await booking.save();

  await Room.updateOne(
    { _id: booking.roomId, "availability.bookingId": booking._id },
    { $set: { "availability.$.status": "cancelled" } }
  );

  res.status(200).json({ success: true, message: "বুকিং বাতিল করা হয়েছে।" });
});

// PATCH /api/bookings/:id/complete
const completeBooking = catchAsync(async (req, res, next) => {
  objectId(req.params.id, "বুকিং আইডি");
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError("বুকিং পাওয়া যায়নি।", 404));
  const allowed = await assertBookingAccess(req.user, booking, next);
  if (!allowed) return;
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
const getBookings = catchAsync(async (req, res, next) => {
  const user = req.user;
  const { status, date, from, to, page = 1, limit = 20 } = req.query;

  await expireStaleHolds();

  let filter = {};

  if (user.role === "agent") {
    filter.agentId = user._id;
  } else if (["boat_owner", "manager"].includes(user.role)) {
    const houseboat = await getManagedHouseboat(user);
    if (!houseboat) {
      return res.status(200).json({ success: true, data: { total: 0, page: Number(page), pages: 0, bookings: [] } });
    }
    filter.houseboatId = houseboat._id;
  }

  if (status) filter.status = enumValue(status, ["on_hold", "confirmed", "cancelled", "expired", "completed"], "বুকিং স্ট্যাটাস");
  if (date) {
    const d = startOfDay(date);
    if (!d) return next(new AppError("সঠিক তারিখ দিন।", 400));
    const next = addDays(d, 1);
    filter.checkIn = { $lt: next };
    filter.checkOut = { $gt: d };
  } else if (from || to) {
    const rangeStart = from ? startOfDay(from) : new Date(0);
    const toDay = to ? startOfDay(to) : null;
    if (!rangeStart || (to && !toDay)) return next(new AppError("সঠিক তারিখ রেঞ্জ দিন।", 400));
    const rangeEnd = to ? addDays(toDay, 1) : new Date("9999-12-31");
    filter.checkIn = { $lt: rangeEnd };
    filter.checkOut = { $gt: rangeStart };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("roomId", "roomNumber roomType acRoomPrice nonAcRoomPrice basePrice")
      .populate("agentId", "name phone")
      .sort("-createdAt")
      .skip(skip)
      .limit(safeLimit),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { total, page: safePage, pages: Math.ceil(total / safeLimit), bookings },
  });
});

// GET /api/bookings/manifest?from=&to=
const getManifest = catchAsync(async (req, res, next) => {
  const user = req.user;
  const { from, to } = req.query;
  await expireStaleHolds();
  const rangeStart = startOfDay(from || new Date());
  const toDay = to ? startOfDay(to) : null;
  if (!rangeStart || (to && !toDay)) return next(new AppError("সঠিক তারিখ রেঞ্জ দিন।", 400));
  const rangeEnd = to ? addDays(toDay, 1) : addDays(rangeStart, 14);

  let houseboatId = null;
  if (["boat_owner", "manager"].includes(user.role)) {
    const houseboat = await getManagedHouseboat(user);
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
  objectId(req.params.id, "বুকিং আইডি");
  const booking = await Booking.findById(req.params.id)
    .populate("roomId", "roomNumber roomType acRoomPrice nonAcRoomPrice basePrice")
    .populate("agentId", "name phone email")
    .populate("approvedById", "name")
    .populate("houseboatId", "name location");

  if (!booking) return next(new AppError("বুকিং পাওয়া যায়নি।", 404));
  const allowed = await assertBookingAccess(req.user, booking, next);
  if (!allowed) return;

  const houseboat = typeof booking.houseboatId === "object"
    ? booking.houseboatId
    : await Houseboat.findById(booking.houseboatId);
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
  placeHold, createDirectBooking, confirmBooking, cancelBooking, completeBooking, getBookings, getBooking, getManifest,
};
