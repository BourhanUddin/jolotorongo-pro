const Room = require("../models/Room");
const Houseboat = require("../models/Houseboat");
const { AppError, catchAsync } = require("../utils/appError");
const { getTwoDaySlot, activeOverlapFilter } = require("../utils/bookingSlot");

// Helper: get houseboat for the logged-in owner/manager
const getManagedHouseboat = async (user) => {
  if (user.role === "boat_owner") return Houseboat.findOne({ ownerId: user._id });
  if (user.role === "manager" && user.joinedHouseboatId) return Houseboat.findById(user.joinedHouseboatId);
  return null;
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
  const houseboat = await getManagedHouseboat(req.user);
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  const rooms = await Room.find({ houseboatId: houseboat._id }).sort("roomNumber");
  res.status(200).json({ success: true, data: { count: rooms.length, rooms } });
});

// GET /api/rooms/:id
const getRoom = catchAsync(async (req, res, next) => {
  const room = await Room.findById(req.params.id).populate("houseboatId", "name");
  if (!room) return next(new AppError("রুম পাওয়া যায়নি।", 404));
  res.status(200).json({ success: true, data: { room } });
});

// POST /api/rooms
const createRoom = catchAsync(async (req, res, next) => {
  const houseboat = await getManagedHouseboat(req.user);
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  const imageUrls = [
    ...normalizeArray(req.body.imageUrls),
    ...normalizeArray(req.body.images),
    ...(req.uploadedImageUrls || []),
  ];

  const room = await Room.create({
    ...req.body,
    houseboatId: houseboat._id,
    amenities: normalizeArray(req.body.amenities),
    images: imageUrls,
  });
  res.status(201).json({ success: true, data: { room } });
});

// PATCH /api/rooms/:id
const updateRoom = catchAsync(async (req, res, next) => {
  const imageUrls = [
    ...normalizeArray(req.body.imageUrls),
    ...normalizeArray(req.body.images),
    ...(req.uploadedImageUrls || []),
  ];
  const payload = {
    ...req.body,
    ...(req.body.amenities !== undefined ? { amenities: normalizeArray(req.body.amenities) } : {}),
    ...(imageUrls.length > 0 ? { images: imageUrls } : {}),
  };

  const room = await Room.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!room) return next(new AppError("রুম পাওয়া যায়নি।", 404));
  res.status(200).json({ success: true, data: { room } });
});

// PATCH /api/rooms/:id/toggle-active
const toggleRoomActive = catchAsync(async (req, res, next) => {
  const room = await Room.findById(req.params.id);
  if (!room) return next(new AppError("রুম পাওয়া যায়নি।", 404));
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

  const Booking = require("../models/Booking");
  const slot = getTwoDaySlot({ checkIn, checkOut });
  if (!slot) return next(new AppError("সঠিক তারিখ দিন।", 400));
  if (slot.error) return next(new AppError(slot.error, 400));

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
  }).select("roomId status expiresAt checkIn checkOut customerName");

  const result = rooms.map((r) => ({
    ...r.toObject(),
    availableOnDate: !blockingBookings.some((b) => String(b.roomId) === String(r._id)),
    availabilityState: r.status === "maintenance"
      ? "maintenance"
      : (() => {
          const booking = blockingBookings.find((b) => String(b.roomId) === String(r._id));
          if (!booking) return "available";
          return booking.status === "on_hold" ? "on_hold" : "booked";
        })(),
    blockingBooking: blockingBookings.find((b) => String(b.roomId) === String(r._id)) || null,
  }));

  res.status(200).json({
    success: true,
    data: { checkIn: slot.checkIn, checkOut: slot.checkOut, rooms: result },
  });
});

module.exports = { getRooms, getRoom, createRoom, updateRoom, toggleRoomActive, checkAvailability };
