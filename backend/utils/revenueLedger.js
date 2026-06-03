const Invoice = require("../models/Invoice");
const Ledger = require("../models/Ledger");

const invoiceNoFor = (booking) => `JT-${new Date().getFullYear()}-${String(booking._id).slice(-8).toUpperCase()}`;

const recordBookingRevenue = async ({ booking, room, houseboat, source, agentCommission = 0 }) => {
  const safeCommission = Math.max(0, Number(agentCommission) || 0);
  const existingInvoice = await Invoice.findOne({ bookingId: booking._id });
  const draftItems = existingInvoice?.status === "draft" && existingInvoice.items?.length
    ? existingInvoice.items
    : null;
  const items = draftItems || [
    { label: `Room ${room.roomNumber} (${room.roomType})`, amount: booking.basePrice },
    { label: "Extra guest charge", amount: booking.extraCharge },
  ];
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const discount = existingInvoice?.status === "draft" ? Math.max(0, Number(existingInvoice.discount) || 0) : (booking.discount || 0);
  const total = Math.max(0, subtotal - discount);
  const netRevenue = Math.max(0, total - safeCommission);

  const invoice = await Invoice.findOneAndUpdate(
    { bookingId: booking._id },
    {
      houseboatId: booking.houseboatId,
      bookingId: booking._id,
      invoiceNo: invoiceNoFor(booking),
      status: "final",
      items,
      subtotal,
      discount,
      agentCommission: safeCommission,
      netRevenue,
      total,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await Ledger.findOneAndUpdate(
    { bookingId: booking._id },
    {
      houseboatId: booking.houseboatId,
      bookingId: booking._id,
      invoiceId: invoice._id,
      roomId: booking.roomId?._id || booking.roomId,
      agentId: source === "agent_request" ? booking.agentId : null,
      vesselName: houseboat.name,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      grossRevenue: total,
      agentCommission: safeCommission,
      netRevenue,
      source,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  booking.invoiceSentAt = booking.invoiceSentAt || new Date();
  booking.agentCommission = safeCommission;
  booking.discount = discount;
  booking.totalPrice = total;
  booking.netRevenue = netRevenue;
  await booking.save();

  return { invoice, netRevenue };
};

module.exports = { recordBookingRevenue };
