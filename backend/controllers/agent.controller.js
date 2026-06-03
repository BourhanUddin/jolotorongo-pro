const User = require("../models/User");
const Houseboat = require("../models/Houseboat");
const JoinRequest = require("../models/JoinRequest");
const Tour = require("../models/Tour");
const Booking = require("../models/Booking");
const { AppError, catchAsync } = require("../utils/appError");
const { pushNotification } = require("../utils/notification");
const { objectId, optionalString } = require("../utils/validation");
const { getTwoDaySlot, activeOverlapFilter } = require("../utils/bookingSlot");
const { expireStaleHolds } = require("../utils/holdExpiry");

// ──────────────────────────────────────────────────────────────
// SUPER ADMIN — Verify / Suspend Agents
// ──────────────────────────────────────────────────────────────

// GET /api/agents/unverified
const getUnverifiedAgents = catchAsync(async (req, res) => {
  const agents = await User.find({
    role: "agent",
    status: "unverified",
    isApprovedByAdmin: false,
  }).select("-password").sort("createdAt");

  res.status(200).json({ success: true, data: { count: agents.length, agents } });
});

// PATCH /api/agents/:agentId/verify
const verifyAgent = catchAsync(async (req, res, next) => {
  objectId(req.params.agentId, "এজেন্ট আইডি");
  const agent = await User.findById(req.params.agentId);
  if (!agent || agent.role !== "agent") {
    return next(new AppError("এজেন্ট পাওয়া যায়নি।", 404));
  }

  agent.status = "active";
  agent.isApprovedByAdmin = true;
  await agent.save();

  await pushNotification(
    agent._id,
    "✅ আপনার অ্যাকাউন্ট ভেরিফাই হয়েছে! এখন আপনি বোটে যোগ দেওয়ার আবেদন করতে পারবেন।",
    "success"
  );

  res.status(200).json({ success: true, message: "এজেন্ট ভেরিফাই সফল।", data: { agent } });
});

// PATCH /api/agents/:agentId/suspend
const suspendAgent = catchAsync(async (req, res, next) => {
  objectId(req.params.agentId, "এজেন্ট আইডি");
  const agent = await User.findById(req.params.agentId);
  if (!agent || agent.role !== "agent") {
    return next(new AppError("এজেন্ট পাওয়া যায়নি।", 404));
  }

  agent.status = "suspended";
  await agent.save();

  await pushNotification(agent._id, "⛔ আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।", "error");

  res.status(200).json({ success: true, message: "এজেন্ট সাসপেন্ড করা হয়েছে।" });
});

// ──────────────────────────────────────────────────────────────
// AGENT — View Houseboats & Send Join Request
// ──────────────────────────────────────────────────────────────

// GET /api/agents/houseboats
// Unverified agents can ONLY see this list (no other features).
const listHouseboats = catchAsync(async (req, res) => {
  const houseboats = await Houseboat.find({ isOperational: true })
    .populate("ownerId", "name phone")
    .select("name location logoUrl ownerId")
    .sort("name");

  res.status(200).json({ success: true, data: { count: houseboats.length, houseboats } });
});

// POST /api/agents/join-request
// Only verified (active) agents can send join requests.
const sendJoinRequest = catchAsync(async (req, res, next) => {
  const agent = req.user;

  if (agent.status !== "active" || !agent.isApprovedByAdmin) {
    return next(
      new AppError("শুধুমাত্র ভেরিফাইড এজেন্ট যোগ দেওয়ার আবেদন করতে পারবেন।", 403)
    );
  }

  const { houseboatId, message } = req.body;
  objectId(houseboatId, "হাউসবোট আইডি");
  const houseboat = await Houseboat.findById(houseboatId).populate("ownerId", "_id name");

  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));
  if (!houseboat.isOperational) {
    return next(new AppError("এই হাউসবোটটি এখন সক্রিয় নয়।", 400));
  }

  const alreadyApproved = houseboat.approvedAgents.some((agentId) => String(agentId) === String(agent._id));
  if (alreadyApproved || String(agent.joinedHouseboatId || "") === String(houseboatId)) {
    return next(new AppError("আপনি ইতিমধ্যে এই হাউসবোটে আছেন।", 400));
  }

  // Check duplicate pending request
  const existing = await JoinRequest.findOne({ agentId: agent._id, houseboatId });
  if (existing && existing.status === "pending") {
    return next(new AppError("আপনার আবেদন ইতিমধ্যে পাঠানো হয়েছে। অনুমোদনের জন্য অপেক্ষা করুন।", 400));
  }
  if (existing && existing.status === "approved") {
    return next(new AppError("আপনি ইতিমধ্যে এই হাউসবোটের অনুমোদিত এজেন্ট।", 400));
  }
  if (existing && existing.status === "rejected") {
    existing.status = "pending";
    existing.message = optionalString(message, 500);
    existing.reviewedAt = null;
    existing.reviewNote = null;
    await existing.save();

    await pushNotification(
      houseboat.ownerId._id,
      `🙋 ${agent.name} আপনার "${houseboat.name}" বোটে আবার যোগ দিতে চান।`,
      "info"
    );

    return res.status(200).json({
      success: true,
      message: "যোগ দেওয়ার আবেদন আবার পাঠানো হয়েছে।",
      data: { joinRequest: existing },
    });
  }

  const joinRequest = await JoinRequest.create({
    agentId: agent._id,
    houseboatId,
    ownerId: houseboat.ownerId._id,
    message: optionalString(message, 500),
  });

  await pushNotification(
    houseboat.ownerId._id,
    `🙋 ${agent.name} আপনার "${houseboat.name}" বোটে যোগ দিতে চান।`,
    "info"
  );

  res.status(201).json({
    success: true,
    message: "যোগ দেওয়ার আবেদন পাঠানো হয়েছে।",
    data: { joinRequest },
  });
});

// GET /api/agents/join-requests/my
const getMyJoinRequests = catchAsync(async (req, res) => {
  const requests = await JoinRequest.find({ agentId: req.user._id })
    .populate("houseboatId", "name location logoUrl")
    .sort("-createdAt");

  res.status(200).json({ success: true, data: { requests } });
});

// GET /api/agents/available-rooms?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
const getApprovedAvailableRooms = catchAsync(async (req, res, next) => {
  const agent = req.user;
  if (agent.status !== "active" || !agent.isApprovedByAdmin) {
    return next(new AppError("শুধু ভেরিফাইড এজেন্ট availability দেখতে পারবেন।", 403));
  }

  const slot = getTwoDaySlot({ checkIn: req.query.checkIn, checkOut: req.query.checkOut });
  if (!slot) return next(new AppError("চেক-ইন তারিখ দিন।", 400));
  if (slot.error) return next(new AppError(slot.error, 400));

  await expireStaleHolds();

  const boats = await Houseboat.find({
    isOperational: true,
    approvedAgents: agent._id,
  })
    .populate("ownerId", "name phone")
    .sort("name");

  const boatIds = boats.map((boat) => boat._id);
  const tours = await Tour.find({
    houseboatId: { $in: boatIds },
    status: "scheduled",
    checkIn: slot.checkIn,
    checkOut: slot.checkOut,
  }).populate("roomIds");

  const roomIds = tours.flatMap((tour) => tour.roomIds.map((room) => room._id));
  const bookings = roomIds.length
    ? await Booking.find({
        roomId: { $in: roomIds },
        ...activeOverlapFilter({ roomId: { $in: roomIds }, checkIn: slot.checkIn, checkOut: slot.checkOut }),
      }).select("roomId status expiresAt")
    : [];

  const tourByBoatId = new Map(tours.map((tour) => [String(tour.houseboatId), tour]));
  const groups = boats.map((boat) => {
    const tour = tourByBoatId.get(String(boat._id));
    const rooms = (tour?.roomIds || [])
      .filter((room) => room.isActive && room.status !== "maintenance")
      .filter((room) => !bookings.some((booking) => String(booking.roomId) === String(room._id)))
      .map((room) => ({
        ...room.toObject(),
        availabilityState: "available",
        availableOnDate: true,
      }));

    return { boat, tour: tour || null, rooms };
  }).filter((group) => group.tour && group.rooms.length > 0);

  res.status(200).json({
    success: true,
    data: { checkIn: slot.checkIn, checkOut: slot.checkOut, groups },
  });
});

// ──────────────────────────────────────────────────────────────
// BOAT OWNER — Manage Join Requests from Agents
// ──────────────────────────────────────────────────────────────

// GET /api/agents/join-requests/incoming
const getIncomingJoinRequests = catchAsync(async (req, res) => {
  const houseboat = await Houseboat.findOne({ ownerId: req.user._id });
  if (!houseboat) return res.status(200).json({ success: true, data: { requests: [] } });

  const requests = await JoinRequest.find({
    houseboatId: houseboat._id,
    status: "pending",
  })
    .populate("agentId", "name email phone createdAt")
    .sort("-createdAt");

  res.status(200).json({ success: true, data: { count: requests.length, requests } });
});

// PATCH /api/agents/join-requests/:requestId/approve
const approveJoinRequest = catchAsync(async (req, res, next) => {
  objectId(req.params.requestId, "আবেদন আইডি");
  const joinReq = await JoinRequest.findById(req.params.requestId).populate("agentId");
  if (!joinReq) return next(new AppError("আবেদন পাওয়া যায়নি।", 404));
  if (joinReq.status !== "pending") return next(new AppError("শুধু পেন্ডিং আবেদন অনুমোদন করা যাবে।", 400));

  // Ensure this owner owns the houseboat
  const houseboat = await Houseboat.findById(joinReq.houseboatId);
  if (String(houseboat.ownerId) !== String(req.user._id)) {
    return next(new AppError("আপনার এই অনুমতি নেই।", 403));
  }
  joinReq.status = "approved";
  joinReq.reviewedAt = new Date();
  await joinReq.save();

  // Keep legacy default boat only when empty; approvedAgents[] is network source of truth.
  if (!joinReq.agentId.joinedHouseboatId) {
    await User.findByIdAndUpdate(joinReq.agentId._id, {
      joinedHouseboatId: houseboat._id,
    });
  }
  await Houseboat.findByIdAndUpdate(houseboat._id, {
    $addToSet: { approvedAgents: joinReq.agentId._id },
  });

  await pushNotification(
    joinReq.agentId._id,
    `✅ "${houseboat.name}" বোটে যোগ দেওয়ার আবেদন অনুমোদিত হয়েছে!`,
    "success"
  );

  res.status(200).json({ success: true, message: "এজেন্ট অনুমোদিত হয়েছে।" });
});

// PATCH /api/agents/join-requests/:requestId/reject
const rejectJoinRequest = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  objectId(req.params.requestId, "আবেদন আইডি");
  const joinReq = await JoinRequest.findById(req.params.requestId).populate("agentId");
  if (!joinReq) return next(new AppError("আবেদন পাওয়া যায়নি।", 404));
  if (joinReq.status !== "pending") return next(new AppError("শুধু পেন্ডিং আবেদন প্রত্যাখ্যান করা যাবে।", 400));

  const houseboat = await Houseboat.findById(joinReq.houseboatId);
  if (String(houseboat.ownerId) !== String(req.user._id)) {
    return next(new AppError("আপনার এই অনুমতি নেই।", 403));
  }

  joinReq.status = "rejected";
  joinReq.reviewedAt = new Date();
  joinReq.reviewNote = optionalString(reason, 500);
  await joinReq.save();

  await pushNotification(
    joinReq.agentId._id,
    `❌ "${houseboat.name}" বোটে যোগ দেওয়ার আবেদন প্রত্যাখ্যান হয়েছে। কারণ: ${reason || "উল্লেখ নেই"}`,
    "error"
  );

  res.status(200).json({ success: true, message: "আবেদন প্রত্যাখ্যান করা হয়েছে।" });
});

module.exports = {
  getUnverifiedAgents,
  verifyAgent,
  suspendAgent,
  listHouseboats,
  sendJoinRequest,
  getMyJoinRequests,
  getApprovedAvailableRooms,
  getIncomingJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
};
