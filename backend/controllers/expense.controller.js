const Expense = require("../models/Expense");
const Booking = require("../models/Booking");
const Ledger = require("../models/Ledger");
const Houseboat = require("../models/Houseboat");
const { AppError, catchAsync } = require("../utils/appError");
const { addDays, startOfDay } = require("../utils/bookingSlot");
const { requiredString, optionalString, numberValue, enumValue, objectId } = require("../utils/validation");

const EXPENSE_CATEGORIES = ["fuel", "food", "repair", "salary", "utility", "marketing", "other"];

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
  if (category) filter.category = enumValue(category, EXPENSE_CATEGORIES, "ক্যাটাগরি");
  if (from || to) {
    filter.date = {};
    if (from) {
      const parsedFrom = startOfDay(from);
      if (!parsedFrom) return next(new AppError("সঠিক শুরু তারিখ দিন।", 400));
      filter.date.$gte = parsedFrom;
    }
    if (to) {
      const parsedTo = startOfDay(to);
      if (!parsedTo) return next(new AppError("সঠিক শেষ তারিখ দিন।", 400));
      filter.date.$lte = addDays(parsedTo, 1);
    }
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;
  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .populate("createdById", "name")
      .sort("-date")
      .skip(skip)
      .limit(safeLimit),
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
    data: { total, totalAmount, page: safePage, pages: Math.ceil(total / safeLimit), expenses },
  });
});

// POST /api/expenses
const createExpense = catchAsync(async (req, res, next) => {
  const houseboat = await getManagedHouseboat(req.user);
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  const date = req.body.date ? startOfDay(req.body.date) : new Date();
  if (!date) return next(new AppError("সঠিক তারিখ দিন।", 400));

  const expense = await Expense.create({
    title: requiredString(req.body.title, "ব্যয়ের শিরোনাম", 120),
    amount: numberValue(req.body.amount, "ব্যয়ের পরিমাণ", { min: 0 }),
    category: enumValue(req.body.category || "other", EXPENSE_CATEGORIES, "ক্যাটাগরি"),
    note: optionalString(req.body.note, 500),
    date,
    houseboatId: houseboat._id,
    createdById: req.user._id,
  });
  res.status(201).json({ success: true, data: { expense } });
});

// PATCH /api/expenses/:id
const updateExpense = catchAsync(async (req, res, next) => {
  objectId(req.params.id, "ব্যয় আইডি");
  const houseboat = await getManagedHouseboat(req.user);
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  const payload = {};
  if (req.body.title !== undefined) payload.title = requiredString(req.body.title, "ব্যয়ের শিরোনাম", 120);
  if (req.body.amount !== undefined) payload.amount = numberValue(req.body.amount, "ব্যয়ের পরিমাণ", { min: 0 });
  if (req.body.category !== undefined) payload.category = enumValue(req.body.category, EXPENSE_CATEGORIES, "ক্যাটাগরি");
  if (req.body.note !== undefined) payload.note = optionalString(req.body.note, 500);
  if (req.body.date !== undefined) {
    payload.date = startOfDay(req.body.date);
    if (!payload.date) return next(new AppError("সঠিক তারিখ দিন।", 400));
  }

  const expense = await Expense.findOneAndUpdate({ _id: req.params.id, houseboatId: houseboat._id }, payload, {
    new: true, runValidators: true,
  });
  if (!expense) return next(new AppError("ব্যয় পাওয়া যায়নি।", 404));
  res.status(200).json({ success: true, data: { expense } });
});

// DELETE /api/expenses/:id
const deleteExpense = catchAsync(async (req, res, next) => {
  objectId(req.params.id, "ব্যয় আইডি");
  const houseboat = await getManagedHouseboat(req.user);
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, houseboatId: houseboat._id });
  if (!expense) return next(new AppError("ব্যয় পাওয়া যায়নি।", 404));
  res.status(200).json({ success: true, message: "ব্যয় মুছে ফেলা হয়েছে।" });
});

// GET /api/expenses/report?from=&to=
const getFinanceReport = catchAsync(async (req, res, next) => {
  const houseboat = await getManagedHouseboat(req.user);
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  const { from, to } = req.query;
  const dateFilter = {};
  if (from) {
    dateFilter.$gte = startOfDay(from);
    if (!dateFilter.$gte) return next(new AppError("সঠিক শুরু তারিখ দিন।", 400));
  }
  if (to) {
    const parsedTo = startOfDay(to);
    if (!parsedTo) return next(new AppError("সঠিক শেষ তারিখ দিন।", 400));
    dateFilter.$lte = addDays(parsedTo, 1);
  }

  const expenseFilter = { houseboatId: houseboat._id };
  const bookingFilter = { houseboatId: houseboat._id, status: { $in: ["confirmed", "completed"] } };
  const ledgerFilter = { houseboatId: houseboat._id };
  if (from || to) {
    expenseFilter.date = dateFilter;
    const rangeStart = from ? startOfDay(from) : new Date(0);
    const toDay = to ? startOfDay(to) : null;
    if (!rangeStart || (to && !toDay)) return next(new AppError("সঠিক তারিখ রেঞ্জ দিন।", 400));
    const rangeEnd = to ? addDays(toDay, 1) : new Date("9999-12-31");
    bookingFilter.checkIn = { $lt: rangeEnd };
    bookingFilter.checkOut = { $gt: rangeStart };
    ledgerFilter.checkIn = { $lt: rangeEnd };
    ledgerFilter.checkOut = { $gt: rangeStart };
  }

  const [expenseAgg, revenueAgg, ledgerAgg] = await Promise.all([
    Expense.aggregate([
      { $match: expenseFilter },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]),
    Booking.aggregate([
      { $match: bookingFilter },
      { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" }, totalAdvance: { $sum: "$advancePaid" } } },
    ]),
    Ledger.aggregate([
      { $match: ledgerFilter },
      { $group: { _id: null, grossRevenue: { $sum: "$grossRevenue" }, agentCommission: { $sum: "$agentCommission" }, netRevenue: { $sum: "$netRevenue" } } },
    ]),
  ]);

  const totalExpense = expenseAgg.reduce((acc, e) => acc + e.total, 0);
  const totalRevenue = ledgerAgg[0]?.netRevenue ?? revenueAgg[0]?.totalRevenue ?? 0;
  const grossRevenue = ledgerAgg[0]?.grossRevenue ?? revenueAgg[0]?.totalRevenue ?? 0;
  const agentCommission = ledgerAgg[0]?.agentCommission || 0;
  const netProfit = totalRevenue - totalExpense;

  res.status(200).json({
    success: true,
    data: {
      totalRevenue,
      grossRevenue,
      agentCommission,
      totalExpense,
      netProfit,
      expenseByCategory: expenseAgg,
    },
  });
});

module.exports = { getExpenses, createExpense, updateExpense, deleteExpense, getFinanceReport };
