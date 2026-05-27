const Houseboat = require("../models/Houseboat");
const { AppError, catchAsync } = require("../utils/appError");

// GET /api/houseboat/my  — owner gets own houseboat
const getMyHouseboat = catchAsync(async (req, res, next) => {
  const houseboat = await Houseboat.findOne({ ownerId: req.user._id })
    .populate("approvedAgents", "name email phone status");
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));
  res.status(200).json({ success: true, data: { houseboat } });
});

// PATCH /api/houseboat/my  — owner updates own houseboat
const updateMyHouseboat = catchAsync(async (req, res, next) => {
  const allowed = ["name", "location", "logoUrl", "holdTimeoutMinutes"];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  const houseboat = await Houseboat.findOneAndUpdate(
    { ownerId: req.user._id },
    updates,
    { new: true, runValidators: true }
  );
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));
  res.status(200).json({ success: true, message: "হাউসবোট আপডেট হয়েছে।", data: { houseboat } });
});

// DELETE /api/houseboat/agents/:agentId  — remove an agent from houseboat
const removeAgent = catchAsync(async (req, res, next) => {
  const houseboat = await Houseboat.findOne({ ownerId: req.user._id });
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  await Houseboat.updateOne(
    { _id: houseboat._id },
    { $pull: { approvedAgents: req.params.agentId } }
  );

  const User = require("../models/User");
  await User.updateOne(
    { _id: req.params.agentId },
    { joinedHouseboatId: null }
  );

  res.status(200).json({ success: true, message: "এজেন্ট সরানো হয়েছে।" });
});

module.exports = { getMyHouseboat, updateMyHouseboat, removeAgent };