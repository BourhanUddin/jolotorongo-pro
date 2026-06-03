const Tour = require("../models/Tour");
const Room = require("../models/Room");
const Houseboat = require("../models/Houseboat");
const Booking = require("../models/Booking");
const { AppError, catchAsync } = require("../utils/appError");
const { getTwoDaySlot, activeOverlapFilter } = require("../utils/bookingSlot");
const { expireStaleHolds } = require("../utils/holdExpiry");
const { objectId, optionalString, requiredString, enumValue } = require("../utils/validation");

const getManagedHouseboats = async (user) => {
  if (user.role === "boat_owner") return Houseboat.find({ ownerId: user._id }).sort("-isOperational name");
  if (user.role === "manager" && user.joinedHouseboatId) {
    const houseboat = await Houseboat.findById(user.joinedHouseboatId);
    return houseboat ? [houseboat] : [];
  }
  return [];
};

const resolveHouseboat = async (user, requestedId, next) => {
  if (user.role === "agent") {
    const id = requestedId || user.joinedHouseboatId;
    if (!id) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));
    objectId(id, "হাউসবোট আইডি");
    const houseboat = await Houseboat.findById(id);
    if (!houseboat || !houseboat.isOperational) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));
    const approved = houseboat.approvedAgents.some((agentId) => String(agentId) === String(user._id));
    if (!approved) return next(new AppError("এই হাউসবোটের availability দেখার অনুমতি নেই।", 403));
    return houseboat;
  }
  const houseboats = await getManagedHouseboats(user);
  if (houseboats.length === 0) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));
  if (!requestedId) return houseboats.find((boat) => boat.isOperational) || houseboats[0];
  objectId(requestedId, "হাউসবোট আইডি");
  const selected = houseboats.find((boat) => String(boat._id) === String(requestedId));
  if (!selected) return next(new AppError("এই হাউসবোটে আপনার অনুমতি নেই।", 403));
  return selected;
};

const normalizeRoomIds = (roomIds) => {
  if (!roomIds) return [];
  const raw = Array.isArray(roomIds) ? roomIds : String(roomIds).split(",");
  return raw.map((id) => String(id).trim()).filter(Boolean);
};

const assertRoomsBelong = async ({ roomIds, houseboatId, next }) => {
  const ids = normalizeRoomIds(roomIds);
  ids.forEach((id) => objectId(id, "রুম আইডি"));
  const rooms = await Room.find({ _id: { $in: ids }, houseboatId, isActive: true });
  if (rooms.length !== ids.length) return next(new AppError("সব রুম এই হাউসবোটের নয়।", 400));
  return ids;
};

const listTours = catchAsync(async (req, res, next) => {
  const houseboat = await resolveHouseboat(req.user, req.query.houseboatId, next);
  if (!houseboat) return;
  const filter = { houseboatId: houseboat._id };
  if (req.query.status) filter.status = enumValue(req.query.status, ["scheduled", "cancelled", "completed"], "ট্যুর স্ট্যাটাস");
  const tours = await Tour.find(filter)
    .populate("houseboatId", "name location")
    .populate("roomIds", "roomNumber roomType climate acRoomPrice nonAcRoomPrice basePrice status images amenities services maxCapacity")
    .sort("-checkIn");
  res.status(200).json({ success: true, data: { tours } });
});

const createTour = catchAsync(async (req, res, next) => {
  const requestedHouseboatId = req.body.houseboatId || req.body.boatId || req.body.vesselId;
  const houseboat = await resolveHouseboat(req.user, requestedHouseboatId, next);
  if (!houseboat) return;
  if (!houseboat.isOperational) return next(new AppError("হাউসবোট এখন সক্রিয় নয়।", 403));

  const slot = getTwoDaySlot({ checkIn: req.body.checkIn, checkOut: req.body.checkOut });
  if (!slot) return next(new AppError("ট্যুর তারিখ দিন।", 400));
  if (slot.error) return next(new AppError(slot.error, 400));

  const roomIds = await assertRoomsBelong({ roomIds: req.body.roomIds, houseboatId: houseboat._id, next });
  if (!roomIds) return;

  const tour = await Tour.create({
    houseboatId: houseboat._id,
    title: requiredString(req.body.title || houseboat.name, "ট্যুর নাম", 160),
    checkIn: slot.checkIn,
    checkOut: slot.checkOut,
    roomIds,
    createdById: req.user._id,
    note: optionalString(req.body.note, 1000),
  });

  res.status(201).json({ success: true, data: { tour } });
});

const updateTour = catchAsync(async (req, res, next) => {
  objectId(req.params.id, "ট্যুর আইডি");
  const houseboats = await getManagedHouseboats(req.user);
  const tour = await Tour.findOne({ _id: req.params.id, houseboatId: { $in: houseboats.map((boat) => boat._id) } });
  if (!tour) return next(new AppError("ট্যুর পাওয়া যায়নি।", 404));

  if (req.body.title !== undefined) tour.title = requiredString(req.body.title, "ট্যুর নাম", 160);
  if (req.body.note !== undefined) tour.note = optionalString(req.body.note, 1000);
  if (req.body.status !== undefined) tour.status = enumValue(req.body.status, ["scheduled", "cancelled", "completed"], "ট্যুর স্ট্যাটাস");
  if (req.body.checkIn !== undefined || req.body.checkOut !== undefined) {
    const slot = getTwoDaySlot({ checkIn: req.body.checkIn || tour.checkIn, checkOut: req.body.checkOut || tour.checkOut });
    if (!slot || slot.error) return next(new AppError(slot?.error || "সঠিক ট্যুর তারিখ দিন।", 400));
    tour.checkIn = slot.checkIn;
    tour.checkOut = slot.checkOut;
  }
  if (req.body.roomIds !== undefined) {
    const roomIds = await assertRoomsBelong({ roomIds: req.body.roomIds, houseboatId: tour.houseboatId, next });
    if (!roomIds) return;
    tour.roomIds = roomIds;
  }
  await tour.save();
  res.status(200).json({ success: true, data: { tour } });
});

const deleteTour = catchAsync(async (req, res, next) => {
  objectId(req.params.id, "ট্যুর আইডি");
  const houseboats = await getManagedHouseboats(req.user);
  const tour = await Tour.findOneAndDelete({ _id: req.params.id, houseboatId: { $in: houseboats.map((boat) => boat._id) } });
  if (!tour) return next(new AppError("ট্যুর পাওয়া যায়নি।", 404));
  res.status(200).json({ success: true, message: "ট্যুর মুছে ফেলা হয়েছে।" });
});

const getTourMatrix = catchAsync(async (req, res, next) => {
  const houseboat = await resolveHouseboat(req.user, req.query.houseboatId, next);
  if (!houseboat) return;
  const slot = getTwoDaySlot({ checkIn: req.query.checkIn, checkOut: req.query.checkOut });
  if (!slot) return next(new AppError("ট্যুর তারিখ দিন।", 400));
  if (slot.error) return next(new AppError(slot.error, 400));

  await expireStaleHolds();

  const tour = await Tour.findOne({
    houseboatId: houseboat._id,
    status: "scheduled",
    checkIn: slot.checkIn,
    checkOut: slot.checkOut,
  }).populate("roomIds");

  if (!tour) {
    return res.status(200).json({
      success: true,
      message: "এই তারিখে কোনো সক্রিয় ট্যুর নেই।",
      data: { houseboat, tour: null, checkIn: slot.checkIn, checkOut: slot.checkOut, rooms: [] },
    });
  }

  const rooms = tour.roomIds || [];
  const roomIds = rooms.map((room) => room._id);
  const bookings = await Booking.find({
    houseboatId: houseboat._id,
    roomId: { $in: roomIds },
    ...activeOverlapFilter({ roomId: { $in: roomIds }, checkIn: slot.checkIn, checkOut: slot.checkOut }),
  }).select("roomId status customerName expiresAt");

  const matrix = rooms.map((room) => {
    const booking = bookings.find((item) => String(item.roomId) === String(room._id));
    const state = room.status === "maintenance"
      ? "maintenance"
      : booking
        ? booking.status === "on_hold" ? "on_hold" : "booked"
        : "available";
    return {
      ...room.toObject(),
      availabilityState: state,
      availableOnDate: state === "available",
      blockingBookingId: booking?._id || null,
      blockingCustomerName: booking?.customerName || null,
      expiresAt: booking?.expiresAt || null,
    };
  });

  res.status(200).json({
    success: true,
    data: { houseboat, tour, checkIn: slot.checkIn, checkOut: slot.checkOut, rooms: matrix },
  });
});

module.exports = { listTours, createTour, updateTour, deleteTour, getTourMatrix };
