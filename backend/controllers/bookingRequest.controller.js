const mongoose = require("mongoose");
const BookingRequest = require("../models/BookingRequest");
const Booking = require("../models/Booking");
const Houseboat = require("../models/Houseboat");
const Room = require("../models/Room");
const { AppError, catchAsync } = require("../utils/appError");
const { pushNotification } = require("../utils/notification");
const { getTwoDaySlot, activeOverlapFilter } = require("../utils/bookingSlot");
const { expireStaleHolds } = require("../utils/holdExpiry");
const { reserveRoomSlot, releaseRoomSlot } = require("../utils/roomSlotReservation");
const { objectId, optionalString, optionalNumber, requiredString, enumValue } = require("../utils/validation");
const { recordBookingRevenue } = require("../utils/revenueLedger");

const COMMISSION_RATE = 0.1;

const assertRoomAvailable = async ({ roomId, checkIn, checkOut }) => {
  const activeBooking = await Booking.findOne(
    activeOverlapFilter({ roomId, checkIn, checkOut })
  );
  return !activeBooking;
};

const getManagedHouseboat = async (user) => {
  if (user.role === "boat_owner") return Houseboat.findOne({ ownerId: user._id });
  if (user.role === "manager" && user.joinedHouseboatId) return Houseboat.findById(user.joinedHouseboatId);
  return null;
};

// POST /api/booking-requests
const createBookingRequest = catchAsync(async (req, res, next) => {
  const agent = req.user;
  if (agent.role !== "agent" || agent.status !== "active" || !agent.isApprovedByAdmin) {
    return next(new AppError("শুধু ভেরিফাইড এজেন্ট বুকিং রিকোয়েস্ট পাঠাতে পারবেন।", 403));
  }

  const {
    boatId,
    roomId,
    checkIn,
    checkOut,
    guestCount = 1,
    customerName,
    customerPhone,
    customerAddress,
    note,
  } = req.body;
  objectId(boatId, "হাউসবোট আইডি");
  objectId(roomId, "রুম আইডি");
  const slot = getTwoDaySlot({ checkIn, checkOut });
  if (!slot) return next(new AppError("চেক-ইন তারিখ দিন।", 400));
  if (slot.error) return next(new AppError(slot.error, 400));

  await expireStaleHolds();

  const [boat, room] = await Promise.all([
    Houseboat.findById(boatId).populate("ownerId", "_id name"),
    Room.findById(roomId),
  ]);

  if (!boat || !boat.isOperational) return next(new AppError("সক্রিয় হাউসবোট পাওয়া যায়নি।", 404));
  const joined = String(agent.joinedHouseboatId || "") === String(boat._id);
  const approved = boat.approvedAgents.some((agentId) => String(agentId) === String(agent._id));
  if (!joined || !approved) {
    return next(new AppError("এই বোটে বুকিং রিকোয়েস্ট পাঠানোর অনুমতি নেই। আগে বোট ওনারের অনুমোদন নিন।", 403));
  }
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

  const numGuests = optionalNumber(guestCount, "অতিথি সংখ্যা", { min: 1, max: 100, integer: true }) ?? 1;
  const extraCharge = Math.max(0, numGuests - room.maxCapacity) * room.extraPersonPrice;
  const totalPrice = (room.acRoomPrice || room.basePrice) + extraCharge;
  const agentCommission = Math.round(totalPrice * COMMISSION_RATE);
  const bookingCustomerName = requiredString(customerName, "গ্রাহকের নাম", 120);
  const bookingCustomerPhone = requiredString(customerPhone, "গ্রাহকের ফোন", 40);

  const request = await BookingRequest.create({
    agentId: agent._id,
    boatId: boat._id,
    roomId: room._id,
    ownerId: boat.ownerId._id,
    tripDates: { checkIn: slot.checkIn, checkOut: slot.checkOut },
    guestCount: numGuests,
    totalPrice,
    agentCommission,
    customerName: bookingCustomerName,
    customerPhone: bookingCustomerPhone,
    customerAddress: optionalString(customerAddress, 300),
    note: optionalString(note, 1000),
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
  const managedHouseboat = await getManagedHouseboat(req.user);
  const filter = { status: "pending" };
  if (managedHouseboat) {
    filter.boatId = managedHouseboat._id;
  } else {
    filter.ownerId = req.user._id;
  }
  const requests = await BookingRequest.find({
    ...filter,
  })
    .populate("agentId", "name email phone")
    .populate("boatId", "name location")
    .populate("roomId", "roomNumber roomType")
    .sort("-createdAt");

  res.status(200).json({ success: true, data: { count: requests.length, requests } });
});

// PATCH /api/booking-requests/:requestId/payment-confirmed
const markRequestPaymentConfirmed = catchAsync(async (req, res, next) => {
  objectId(req.params.requestId, "রিকোয়েস্ট আইডি");
  const request = await BookingRequest.findOne({
    _id: req.params.requestId,
    agentId: req.user._id,
    status: "pending",
  });
  if (!request) return next(new AppError("পেন্ডিং বুকিং রিকোয়েস্ট পাওয়া যায়নি।", 404));
  request.paymentConfirmedByAgent = true;
  request.paymentConfirmedAt = new Date();
  await request.save();
  res.status(200).json({ success: true, message: "পেমেন্ট কনফার্মড হিসেবে মার্ক করা হয়েছে।", data: { request } });
});

// PATCH /api/booking-requests/:requestId/approve
const approveBookingRequest = catchAsync(async (req, res, next) => {
  objectId(req.params.requestId, "রিকোয়েস্ট আইডি");
  const request = await BookingRequest.findById(req.params.requestId)
    .populate("agentId")
    .populate("roomId")
    .populate("boatId");
  if (!request) return next(new AppError("বুকিং রিকোয়েস্ট পাওয়া যায়নি।", 404));
  const managedHouseboat = await getManagedHouseboat(req.user);
  const canReview = String(request.ownerId) === String(req.user._id) ||
    (managedHouseboat && String(request.boatId._id) === String(managedHouseboat._id));
  if (!canReview) {
    return next(new AppError("এই রিকোয়েস্ট অনুমোদনের অধিকার আপনার নেই।", 403));
  }
  if (request.status !== "pending") {
    return next(new AppError("শুধু পেন্ডিং রিকোয়েস্ট অনুমোদন করা যাবে।", 400));
  }

  await expireStaleHolds();
  const available = await assertRoomAvailable({
    roomId: request.roomId._id,
    checkIn: request.tripDates.checkIn,
    checkOut: request.tripDates.checkOut,
  });
  if (!available) return next(new AppError("এই ট্রিপ তারিখে রুমটি আর উপলব্ধ নেই।", 409));

  const bookingId = new mongoose.Types.ObjectId();
  const reserved = await reserveRoomSlot({
    roomId: request.roomId._id,
    checkIn: request.tripDates.checkIn,
    checkOut: request.tripDates.checkOut,
    status: "booked",
    bookingId,
    bookingRequestId: request._id,
  });
  if (!reserved) return next(new AppError("এই ট্রিপ তারিখে রুমটি আর উপলব্ধ নেই।", 409));

  const booking = new Booking({
    _id: bookingId,
    houseboatId: request.boatId._id,
    roomId: request.roomId._id,
    agentId: request.agentId._id,
    approvedById: req.user._id,
    customerName: req.body.customerName
      ? requiredString(req.body.customerName, "গ্রাহকের নাম", 120)
      : request.customerName || request.agentId.name,
    customerPhone: req.body.customerPhone
      ? requiredString(req.body.customerPhone, "গ্রাহকের ফোন", 40)
      : request.customerPhone || request.agentId.phone || "",
    customerAddress: req.body.customerAddress
      ? optionalString(req.body.customerAddress, 300)
      : request.customerAddress || "",
    guestCount: request.guestCount,
    checkIn: request.tripDates.checkIn,
    checkOut: request.tripDates.checkOut,
    nights: 1,
    referenceName: req.body.referenceName
      ? requiredString(req.body.referenceName, "রেফারেন্স নাম", 120)
      : request.agentId.name,
    basePrice: request.roomId.acRoomPrice || request.roomId.basePrice,
    extraCharge: Math.max(0, request.guestCount - request.roomId.maxCapacity) * request.roomId.extraPersonPrice,
    totalPrice: request.totalPrice,
    agentCommission: request.agentCommission,
    netRevenue: Math.max(0, request.totalPrice - request.agentCommission),
    advancePaid: optionalNumber(req.body.advancePaid, "অগ্রিম", { min: 0 }) ?? 0,
    status: "confirmed",
    paymentMethod: req.body.paymentMethod
      ? enumValue(req.body.paymentMethod, ["cash", "bkash", "nagad", "rocket", "bank", "pending"], "পেমেন্ট পদ্ধতি")
      : "pending",
    note: request.note || "",
  });

  try {
    await booking.save();
  } catch (error) {
    await releaseRoomSlot({ roomId: request.roomId._id, bookingId });
    throw error;
  }

  await recordBookingRevenue({
    booking,
    room: request.roomId,
    houseboat: request.boatId,
    source: "agent_request",
    agentCommission: request.agentCommission,
  });
  request.status = "approved";
  request.reviewedAt = new Date();
  request.bookingId = booking._id;
  await request.save();

  await pushNotification(
    request.agentId._id,
    `✅ "${request.boatId.name}" বুকিং রিকোয়েস্ট অনুমোদিত হয়েছে।`,
    "success"
  );

  res.status(200).json({ success: true, message: "বুকিং রিকোয়েস্ট অনুমোদিত হয়েছে।", data: { booking } });
});

// PATCH /api/booking-requests/:requestId/reject
const rejectBookingRequest = catchAsync(async (req, res, next) => {
  objectId(req.params.requestId, "রিকোয়েস্ট আইডি");
  const request = await BookingRequest.findById(req.params.requestId).populate("agentId boatId");
  if (!request) return next(new AppError("বুকিং রিকোয়েস্ট পাওয়া যায়নি।", 404));
  const managedHouseboat = await getManagedHouseboat(req.user);
  const canReview = String(request.ownerId) === String(req.user._id) ||
    (managedHouseboat && String(request.boatId._id || request.boatId) === String(managedHouseboat._id));
  if (!canReview) {
    return next(new AppError("এই রিকোয়েস্ট প্রত্যাখ্যানের অধিকার আপনার নেই।", 403));
  }
  if (request.status !== "pending") {
    return next(new AppError("শুধু পেন্ডিং রিকোয়েস্ট প্রত্যাখ্যান করা যাবে।", 400));
  }

  request.status = "rejected";
  request.reviewedAt = new Date();
  request.reviewNote = optionalString(req.body.reason, 500);
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
  markRequestPaymentConfirmed,
  approveBookingRequest,
  rejectBookingRequest,
};
