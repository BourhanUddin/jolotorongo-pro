const BookingRequest = require("../models/BookingRequest");
const Booking = require("../models/Booking");
const Houseboat = require("../models/Houseboat");
const Room = require("../models/Room");
const { AppError, catchAsync } = require("../utils/appError");
const { pushNotification } = require("../utils/notification");
const { getTwoDaySlot, activeOverlapFilter } = require("../utils/bookingSlot");

const assertRoomAvailable = async ({ roomId, checkIn, checkOut, excludeRequestId }) => {
  const activeBooking = await Booking.findOne(
    activeOverlapFilter({ roomId, checkIn, checkOut })
  );
  if (activeBooking) return false;

  const pendingRequestFilter = {
    roomId,
    status: "pending",
    "tripDates.checkIn": { $lt: checkOut },
    "tripDates.checkOut": { $gt: checkIn },
  };
  if (excludeRequestId) pendingRequestFilter._id = { $ne: excludeRequestId };

  const pendingRequest = await BookingRequest.findOne(pendingRequestFilter);
  return !pendingRequest;
};

// POST /api/booking-requests
const createBookingRequest = catchAsync(async (req, res, next) => {
  const agent = req.user;
  if (agent.role !== "agent" || agent.status !== "active" || !agent.isApprovedByAdmin) {
    return next(new AppError("শুধু ভেরিফাইড এজেন্ট বুকিং রিকোয়েস্ট পাঠাতে পারবেন।", 403));
  }

  const { boatId, roomId, checkIn, checkOut, guestCount = 1, note } = req.body;
  const slot = getTwoDaySlot({ checkIn, checkOut });
  if (!slot) return next(new AppError("চেক-ইন তারিখ দিন।", 400));
  if (slot.error) return next(new AppError(slot.error, 400));

  const [boat, room] = await Promise.all([
    Houseboat.findById(boatId).populate("ownerId", "_id name"),
    Room.findById(roomId),
  ]);

  if (!boat || !boat.isOperational) return next(new AppError("সক্রিয় হাউসবোট পাওয়া যায়নি।", 404));
  if (!room || String(room.houseboatId) !== String(boat._id)) {
    return next(new AppError("এই বোটে রুমটি পাওয়া যায়নি।", 404));
  }
  if (!room.isActive || room.status === "maintenance") {
    return next(new AppError("এই রুমটি এখন রিকোয়েস্টের জন্য সক্রিয় নয়।", 400));
  }

  const available = await assertRoomAvailable({
    roomId: room._id,
    checkIn: slot.checkIn,
    checkOut: slot.checkOut,
  });
  if (!available) return next(new AppError("এই ট্রিপ তারিখে রুমটি উপলব্ধ নয়।", 409));

  const numGuests = Number(guestCount) || 1;
  const extraCharge = Math.max(0, numGuests - room.maxCapacity) * room.extraPersonPrice;
  const totalPrice = room.basePrice + extraCharge;

  const request = await BookingRequest.create({
    agentId: agent._id,
    boatId: boat._id,
    roomId: room._id,
    ownerId: boat.ownerId._id,
    tripDates: { checkIn: slot.checkIn, checkOut: slot.checkOut },
    guestCount: numGuests,
    totalPrice,
    note: note || "",
  });

  await pushNotification(
    boat.ownerId._id,
    `📩 ${agent.name} "${boat.name}" বোটে একটি বুকিং রিকোয়েস্ট পাঠিয়েছেন।`,
    "info"
  );

  res.status(201).json({
    success: true,
    message: "বুকিং রিকোয়েস্ট পাঠানো হয়েছে।",
    data: { request },
  });
});

// GET /api/booking-requests/my
const getMyBookingRequests = catchAsync(async (req, res) => {
  const requests = await BookingRequest.find({ agentId: req.user._id })
    .populate("boatId", "name location logoUrl")
    .populate("roomId", "roomNumber roomType")
    .sort("-createdAt");

  res.status(200).json({ success: true, data: { requests } });
});

// GET /api/booking-requests/incoming
const getIncomingBookingRequests = catchAsync(async (req, res) => {
  const requests = await BookingRequest.find({
    ownerId: req.user._id,
    status: "pending",
  })
    .populate("agentId", "name email phone")
    .populate("boatId", "name location")
    .populate("roomId", "roomNumber roomType")
    .sort("-createdAt");

  res.status(200).json({ success: true, data: { count: requests.length, requests } });
});

// PATCH /api/booking-requests/:requestId/approve
const approveBookingRequest = catchAsync(async (req, res, next) => {
  const request = await BookingRequest.findById(req.params.requestId)
    .populate("agentId")
    .populate("roomId")
    .populate("boatId");
  if (!request) return next(new AppError("বুকিং রিকোয়েস্ট পাওয়া যায়নি।", 404));
  if (String(request.ownerId) !== String(req.user._id)) {
    return next(new AppError("এই রিকোয়েস্ট অনুমোদনের অধিকার আপনার নেই।", 403));
  }
  if (request.status !== "pending") {
    return next(new AppError("শুধু পেন্ডিং রিকোয়েস্ট অনুমোদন করা যাবে।", 400));
  }

  const available = await assertRoomAvailable({
    roomId: request.roomId._id,
    checkIn: request.tripDates.checkIn,
    checkOut: request.tripDates.checkOut,
    excludeRequestId: request._id,
  });
  if (!available) return next(new AppError("এই ট্রিপ তারিখে রুমটি আর উপলব্ধ নেই।", 409));

  const booking = await Booking.create({
    houseboatId: request.boatId._id,
    roomId: request.roomId._id,
    agentId: request.agentId._id,
    approvedById: req.user._id,
    customerName: req.body.customerName || request.agentId.name,
    customerPhone: req.body.customerPhone || request.agentId.phone || "",
    customerAddress: req.body.customerAddress || "",
    guestCount: request.guestCount,
    checkIn: request.tripDates.checkIn,
    checkOut: request.tripDates.checkOut,
    nights: 1,
    basePrice: request.roomId.basePrice,
    extraCharge: Math.max(0, request.guestCount - request.roomId.maxCapacity) * request.roomId.extraPersonPrice,
    totalPrice: request.totalPrice,
    advancePaid: Number(req.body.advancePaid) || 0,
    status: "confirmed",
    paymentMethod: req.body.paymentMethod || "pending",
    note: request.note || "",
  });

  request.status = "approved";
  request.reviewedAt = new Date();
  request.bookingId = booking._id;
  await request.save();

  await Room.findByIdAndUpdate(request.roomId._id, {
    $push: {
      availability: {
        checkIn: request.tripDates.checkIn,
        checkOut: request.tripDates.checkOut,
        status: "booked",
        bookingId: booking._id,
        bookingRequestId: request._id,
      },
    },
  });

  await pushNotification(
    request.agentId._id,
    `✅ "${request.boatId.name}" বুকিং রিকোয়েস্ট অনুমোদিত হয়েছে।`,
    "success"
  );

  res.status(200).json({ success: true, message: "বুকিং রিকোয়েস্ট অনুমোদিত হয়েছে।", data: { booking } });
});

// PATCH /api/booking-requests/:requestId/reject
const rejectBookingRequest = catchAsync(async (req, res, next) => {
  const request = await BookingRequest.findById(req.params.requestId).populate("agentId boatId");
  if (!request) return next(new AppError("বুকিং রিকোয়েস্ট পাওয়া যায়নি।", 404));
  if (String(request.ownerId) !== String(req.user._id)) {
    return next(new AppError("এই রিকোয়েস্ট প্রত্যাখ্যানের অধিকার আপনার নেই।", 403));
  }

  request.status = "rejected";
  request.reviewedAt = new Date();
  request.reviewNote = req.body.reason || "";
  await request.save();

  await pushNotification(
    request.agentId._id,
    `❌ "${request.boatId.name}" বুকিং রিকোয়েস্ট প্রত্যাখ্যাত হয়েছে।`,
    "error"
  );

  res.status(200).json({ success: true, message: "বুকিং রিকোয়েস্ট প্রত্যাখ্যান করা হয়েছে।" });
});

module.exports = {
  createBookingRequest,
  getMyBookingRequests,
  getIncomingBookingRequests,
  approveBookingRequest,
  rejectBookingRequest,
};
