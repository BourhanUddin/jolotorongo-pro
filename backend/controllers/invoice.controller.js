const Invoice = require("../models/Invoice");
const InvoiceTemplate = require("../models/InvoiceTemplate");
const Booking = require("../models/Booking");
const Houseboat = require("../models/Houseboat");
const { AppError, catchAsync } = require("../utils/appError");
const { objectId, optionalString, numberValue } = require("../utils/validation");

const getManagedHouseboat = async (user) => {
  if (user.role === "boat_owner") return Houseboat.findOne({ ownerId: user._id });
  if (user.role === "manager" && user.joinedHouseboatId) return Houseboat.findById(user.joinedHouseboatId);
  return null;
};

const defaultTemplate = (houseboat) => ({
  title: "Jolotorongo Invoice",
  businessName: houseboat?.name || "",
  phone: "",
  address: houseboat?.location || "",
  paymentInstructions: "",
  terms: "",
  footerNote: "Thank you for booking with us.",
});

const invoiceNoFor = (booking) => `JT-${new Date().getFullYear()}-${String(booking._id).slice(-8).toUpperCase()}`;

const assertBookingScope = async (user, bookingId, next) => {
  objectId(bookingId, "বুকিং আইডি");
  const booking = await Booking.findById(bookingId).populate("roomId");
  if (!booking) return next(new AppError("বুকিং পাওয়া যায়নি।", 404));
  const houseboat = await getManagedHouseboat(user);
  if (!houseboat || String(booking.houseboatId) !== String(houseboat._id)) {
    return next(new AppError("এই ইনভয়েসে আপনার অনুমতি নেই।", 403));
  }
  return { booking, houseboat };
};

const getTemplate = catchAsync(async (req, res, next) => {
  const houseboat = await getManagedHouseboat(req.user);
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  let template = await InvoiceTemplate.findOne({ houseboatId: houseboat._id });
  if (!template) {
    template = await InvoiceTemplate.create({
      houseboatId: houseboat._id,
      ...defaultTemplate(houseboat),
    });
  }

  res.status(200).json({ success: true, data: { template } });
});

const updateTemplate = catchAsync(async (req, res, next) => {
  const houseboat = await getManagedHouseboat(req.user);
  if (!houseboat) return next(new AppError("হাউসবোট পাওয়া যায়নি।", 404));

  const updates = {};
  ["title", "businessName", "phone", "address", "paymentInstructions", "terms", "footerNote"].forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = optionalString(req.body[field], 1000) || "";
  });

  const template = await InvoiceTemplate.findOneAndUpdate(
    { houseboatId: houseboat._id },
    { houseboatId: houseboat._id, ...updates },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  res.status(200).json({ success: true, message: "ইনভয়েস টেমপ্লেট আপডেট হয়েছে।", data: { template } });
});

const getBookingInvoice = catchAsync(async (req, res, next) => {
  const scoped = await assertBookingScope(req.user, req.params.bookingId, next);
  if (!scoped) return;
  const { booking, houseboat } = scoped;
  const template = await InvoiceTemplate.findOne({ houseboatId: houseboat._id });
  const invoice = await Invoice.findOne({ bookingId: booking._id });

  res.status(200).json({
    success: true,
    data: { booking, invoice, template: template || defaultTemplate(houseboat) },
  });
});

const updateDraftForBooking = catchAsync(async (req, res, next) => {
  const scoped = await assertBookingScope(req.user, req.params.bookingId, next);
  if (!scoped) return;
  const { booking } = scoped;
  if (booking.status === "confirmed" || booking.status === "completed") {
    return next(new AppError("কনফার্মড ইনভয়েস এডিট করা যাবে না।", 400));
  }

  const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
  if (!rawItems.length) return next(new AppError("ইনভয়েস আইটেম দিন।", 400));

  const items = rawItems.map((item, index) => ({
    label: optionalString(item.label, 160) || `Item ${index + 1}`,
    amount: numberValue(item.amount, "ইনভয়েস আইটেম মূল্য", { min: 0 }),
  }));
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const discount = numberValue(req.body.discount || 0, "ছাড়", { min: 0 });
  const total = Math.max(0, subtotal - discount);
  const agentCommission = Math.max(0, Number(booking.agentCommission) || 0);
  const netRevenue = Math.max(0, total - agentCommission);

  const invoice = await Invoice.findOneAndUpdate(
    { bookingId: booking._id },
    {
      houseboatId: booking.houseboatId,
      bookingId: booking._id,
      invoiceNo: invoiceNoFor(booking),
      status: "draft",
      items,
      subtotal,
      discount,
      agentCommission,
      netRevenue,
      total,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  res.status(200).json({ success: true, message: "ড্রাফট ইনভয়েস আপডেট হয়েছে।", data: { invoice } });
});

module.exports = { getTemplate, updateTemplate, getBookingInvoice, updateDraftForBooking };
