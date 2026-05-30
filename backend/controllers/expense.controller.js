const Expense = require("../models/Expense");
const Booking = require("../models/Booking");
const Houseboat = require("../models/Houseboat");
const { AppError, catchAsync } = require("../utils/appError");
const { addDays, startOfDay } = require("../utils/bookingSlot");

const getManagedHouseboat = async (user) => {
  if (user.role === "boat_owner") return Houseboat.findOne({ ownerId: user._id });
  if (user.role === "manager" && user.joinedHouseboatId) return Houseboat.findById(user.joinedHouseboatId);
  return null;
};

// GET /api/expenses
const getExpenses = catchAsync(async (req, res, next) => {
  const houseboat = await getManagedHouseboat(req.user);
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  const { from, to, category, page = 1, limit = 20 } = req.query;
  const filter = { houseboatId: houseboat._id };
  if (category) filter.category = category;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .populate("createdById", "name")
      .sort("-date")
      .skip(skip)
      .limit(Number(limit)),
    Expense.countDocuments(filter),
  ]);

  // Sum total
  const aggResult = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
  ]);
  const totalAmount = aggResult[0]?.totalAmount || 0;

  res.status(200).json({
    success: true,
    data: { total, totalAmount, page: Number(page), pages: Math.ceil(total / limit), expenses },
  });
});

// POST /api/expenses
const createExpense = catchAsync(async (req, res, next) => {
  const houseboat = await getManagedHouseboat(req.user);
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  const expense = await Expense.create({
    ...req.body,
    houseboatId: houseboat._id,
    createdById: req.user._id,
  });
  res.status(201).json({ success: true, data: { expense } });
});

// PATCH /api/expenses/:id
const updateExpense = catchAsync(async (req, res, next) => {
  const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!expense) return next(new AppError("ব্যয় পাওয়া যায়নি।", 404));
  res.status(200).json({ success: true, data: { expense } });
});

// DELETE /api/expenses/:id
const deleteExpense = catchAsync(async (req, res, next) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) return next(new AppError("ব্যয় পাওয়া যায়নি।", 404));
  res.status(200).json({ success: true, message: "ব্যয় মুছে ফেলা হয়েছে।" });
});

// GET /api/expenses/report?from=&to=
const getFinanceReport = catchAsync(async (req, res, next) => {
  const houseboat = await getManagedHouseboat(req.user);
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  const { from, to } = req.query;
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);

  const expenseFilter = { houseboatId: houseboat._id };
  const bookingFilter = { houseboatId: houseboat._id, status: { $in: ["confirmed", "completed"] } };
  if (from || to) {
    expenseFilter.date = dateFilter;
    const rangeStart = from ? startOfDay(from) : new Date(0);
    const rangeEnd = to ? addDays(startOfDay(to), 1) : new Date("9999-12-31");
    bookingFilter.checkIn = { $lt: rangeEnd };
    bookingFilter.checkOut = { $gt: rangeStart };
  }

  const [expenseAgg, revenueAgg] = await Promise.all([
    Expense.aggregate([
      { $match: expenseFilter },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]),
    Booking.aggregate([
      { $match: bookingFilter },
      { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" }, totalAdvance: { $sum: "$advancePaid" } } },
    ]),
  ]);

  const totalExpense = expenseAgg.reduce((acc, e) => acc + e.total, 0);
  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
  const netProfit = totalRevenue - totalExpense;

  res.status(200).json({
    success: true,
    data: {
      totalRevenue,
      totalExpense,
      netProfit,
      expenseByCategory: expenseAgg,
    },
  });
});

module.exports = { getExpenses, createExpense, updateExpense, deleteExpense, getFinanceReport };
