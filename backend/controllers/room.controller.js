const Room = require("../models/Room");
const Houseboat = require("../models/Houseboat");
const { AppError, catchAsync } = require("../utils/appError");
const { getTwoDaySlot, activeOverlapFilter } = require("../utils/bookingSlot");
const { expireStaleHolds } = require("../utils/holdExpiry");
const {
  requiredString,
  optionalString,
  numberValue,
  optionalNumber,
  objectId,
  enumValue,
} = require("../utils/validation");

// Helper: get houseboat for the logged-in owner/manager
const getManagedHouseboat = async (user) => {
  if (user.role === "boat_owner") return Houseboat.findOne({ ownerId: user._id });
  if (user.role === "manager" && user.joinedHouseboatId) return Houseboat.findById(user.joinedHouseboatId);
  return null;
};

const getManagedHouseboats = async (user) => {
  if (user.role === "boat_owner") return Houseboat.find({ ownerId: user._id }).sort("-isOperational name");
  if (user.role === "manager" && user.joinedHouseboatId) {
    const houseboat = await Houseboat.findById(user.joinedHouseboatId);
    return houseboat ? [houseboat] : [];
  }
  return [];
};

const resolveManagedHouseboat = async (user, requestedId, next) => {
  const houseboats = await getManagedHouseboats(user);
  if (houseboats.length === 0) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  if (requestedId) {
    objectId(requestedId, "হাউসবোট আইডি");
    const selected = houseboats.find((boat) => String(boat._id) === String(requestedId));
    if (!selected) return next(new AppError("এই হাউসবোটে আপনার অনুমতি নেই।", 403));
    return { houseboat: selected, houseboats };
  }

  const selected = houseboats.find((boat) => boat.isOperational) || houseboats[0];
  return { houseboat: selected, houseboats };
};

const assertManagedRoom = async (user, roomId, next) => {
  objectId(roomId, "রুম আইডি");
  const [houseboats, room] = await Promise.all([
    getManagedHouseboats(user),
    Room.findById(roomId),
  ]);
  if (houseboats.length === 0) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));
  if (!room) return next(new AppError("রুম পাওয়া যায়নি।", 404));
  const houseboat = houseboats.find((boat) => String(boat._id) === String(room.houseboatId));
  if (!houseboat) {
    return next(new AppError("এই রুমে আপনার অনুমতি নেই।", 403));
  }
  return { houseboat, room };
};

const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (err) {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

// GET /api/rooms — list rooms of the owner's houseboat
const getRooms = catchAsync(async (req, res, next) => {
  const access = await resolveManagedHouseboat(req.user, req.query.houseboatId, next);
  if (!access) return;
  const { houseboat, houseboats } = access;

  const rooms = await Room.find({ houseboatId: houseboat._id }).sort("roomNumber");
  res.status(200).json({
    success: true,
    data: { count: rooms.length, rooms, houseboat, houseboats },
  });
});

// GET /api/rooms/:id
const getRoom = catchAsync(async (req, res, next) => {
  const access = await assertManagedRoom(req.user, req.params.id, next);
  if (!access) return;
  const room = await access.room.populate("houseboatId", "name");
  res.status(200).json({ success: true, data: { room } });
});

// POST /api/rooms
const createRoom = catchAsync(async (req, res, next) => {
  const requestedHouseboatId = req.body.houseboatId || req.body.boatId || req.body.vesselId;
  const access = await resolveManagedHouseboat(req.user, requestedHouseboatId, next);
  if (!access) return;
  const { houseboat } = access;

  const imageUrls = [
    ...normalizeArray(req.body.imageUrls),
    ...normalizeArray(req.body.images),
    ...(req.uploadedImageUrls || []),
  ];

  const roomType = enumValue(req.body.roomType || "double", ["single", "double", "family", "vip", "dormitory"], "রুম ধরন");
  const acRoomPrice = req.body.acRoomPrice !== undefined
    ? numberValue(req.body.acRoomPrice, "AC রুম মূল্য", { min: 0 })
    : numberValue(req.body.basePrice, "AC রুম মূল্য", { min: 0 });
  const nonAcRoomPrice = req.body.nonAcRoomPrice !== undefined
    ? numberValue(req.body.nonAcRoomPrice, "Non-AC রুম মূল্য", { min: 0 })
    : acRoomPrice;
  const payload = {
    roomNumber: requiredString(req.body.roomNumber, "রুম নম্বর", 40),
    roomType,
    acRoomPrice,
    nonAcRoomPrice,
    basePrice: acRoomPrice,
    extraPersonPrice: optionalNumber(req.body.extraPersonPrice, "অতিরিক্ত মূল্য", { min: 0 }) ?? 0,
    maxCapacity: optionalNumber(req.body.maxCapacity, "ধারণক্ষমতা", { min: 1, max: 100, integer: true }) ?? 2,
    description: optionalString(req.body.description, 1000),
    houseboatId: houseboat._id,
    amenities: normalizeArray(req.body.amenities),
    services: normalizeArray(req.body.services),
    images: imageUrls,
  };

  const room = await Room.create(payload);
  res.status(201).json({ success: true, data: { room } });
});

// PATCH /api/rooms/:id
const updateRoom = catchAsync(async (req, res, next) => {
  const access = await assertManagedRoom(req.user, req.params.id, next);
  if (!access) return;

  const imageUrls = [
    ...normalizeArray(req.body.imageUrls),
    ...normalizeArray(req.body.images),
    ...(req.uploadedImageUrls || []),
  ];
  const payload = {};
  if (req.body.roomNumber !== undefined) payload.roomNumber = requiredString(req.body.roomNumber, "রুম নম্বর", 40);
  if (req.body.roomType !== undefined) payload.roomType = enumValue(req.body.roomType, ["single", "double", "family", "vip", "dormitory"], "রুম ধরন");
  if (req.body.acRoomPrice !== undefined) {
    payload.acRoomPrice = numberValue(req.body.acRoomPrice, "AC রুম মূল্য", { min: 0 });
    payload.basePrice = payload.acRoomPrice;
  } else if (req.body.basePrice !== undefined) {
    payload.acRoomPrice = numberValue(req.body.basePrice, "AC রুম মূল্য", { min: 0 });
    payload.basePrice = payload.acRoomPrice;
  }
  if (req.body.nonAcRoomPrice !== undefined) payload.nonAcRoomPrice = numberValue(req.body.nonAcRoomPrice, "Non-AC রুম মূল্য", { min: 0 });
  if (req.body.extraPersonPrice !== undefined) payload.extraPersonPrice = numberValue(req.body.extraPersonPrice, "অতিরিক্ত মূল্য", { min: 0 });
  if (req.body.maxCapacity !== undefined) payload.maxCapacity = numberValue(req.body.maxCapacity, "ধারণক্ষমতা", { min: 1, max: 100, integer: true });
  if (req.body.description !== undefined) payload.description = optionalString(req.body.description, 1000);
  if (req.body.status !== undefined) payload.status = enumValue(req.body.status, ["available", "on_hold", "booked", "maintenance"], "রুম স্ট্যাটাস");
  if (req.body.amenities !== undefined) payload.amenities = normalizeArray(req.body.amenities);
  if (req.body.services !== undefined) payload.services = normalizeArray(req.body.services);
  if (imageUrls.length > 0) payload.images = imageUrls;

  const room = await Room.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!room) return next(new AppError("রুম পাওয়া যায়নি।", 404));
  res.status(200).json({ success: true, data: { room } });
});

// PATCH /api/rooms/:id/toggle-active
const toggleRoomActive = catchAsync(async (req, res, next) => {
  const access = await assertManagedRoom(req.user, req.params.id, next);
  if (!access) return;
  const { room } = access;
  room.isActive = !room.isActive;
  await room.save();
  res.status(200).json({
    success: true,
    message: `রুম ${room.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"} করা হয়েছে।`,
    data: { room },
  });
});

// GET /api/rooms/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD  (for agents)
const checkAvailability = catchAsync(async (req, res, next) => {
  const { checkIn, checkOut, houseboatId } = req.query;
  if (!checkIn || !houseboatId) {
    return next(new AppError("চেক-ইন তারিখ এবং হাউসবোট আইডি দিন।", 400));
  }
  objectId(houseboatId, "হাউসবোট আইডি");

  const Booking = require("../models/Booking");
  const slot = getTwoDaySlot({ checkIn, checkOut });
  if (!slot) return next(new AppError("সঠিক তারিখ দিন।", 400));
  if (slot.error) return next(new AppError(slot.error, 400));

  const houseboat = await Houseboat.findById(houseboatId);
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));
  if (req.user.role === "agent") {
    const joined = String(req.user.joinedHouseboatId || "") === String(houseboat._id);
    const approved = houseboat.approvedAgents.some((agentId) => String(agentId) === String(req.user._id));
    if (!houseboat.isOperational || !joined || !approved) {
      return next(new AppError("এই হাউসবোটের availability দেখার অনুমতি নেই।", 403));
    }
  }
  if (["boat_owner", "manager"].includes(req.user.role)) {
    const managed = await getManagedHouseboat(req.user);
    if (!managed || String(managed._id) !== String(houseboat._id)) {
      return next(new AppError("এই হাউসবোটের availability দেখার অনুমতি নেই।", 403));
    }
  }

  await expireStaleHolds();

  const rooms = await Room.find({ houseboatId, isActive: true }).sort("roomNumber");
  const roomIds = rooms.map((room) => room._id);

  const blockingBookings = await Booking.find({
    houseboatId,
    roomId: { $in: roomIds },
    ...activeOverlapFilter({
      roomId: { $in: roomIds },
      checkIn: slot.checkIn,
      checkOut: slot.checkOut,
    }),
  }).select("roomId status expiresAt checkIn checkOut");

  const result = rooms.map((r) => ({
    ...r.toObject(),
    ...(() => {
      const booking = blockingBookings.find((b) => String(b.roomId) === String(r._id));
      const state = r.status === "maintenance"
        ? "maintenance"
        : !booking
          ? "available"
          : booking.status === "on_hold"
            ? "on_hold"
            : "booked";
      return {
        state,
        blockingBookingId: booking?._id || null,
        expiresAt: booking?.expiresAt || null,
        availableOnDate: state === "available",
        availabilityState: state,
        blockingBooking: null,
      };
    })(),
  }));

  res.status(200).json({
    success: true,
    data: { checkIn: slot.checkIn, checkOut: slot.checkOut, rooms: result },
  });
});

module.exports = { getRooms, getRoom, createRoom, updateRoom, toggleRoomActive, checkAvailability };
