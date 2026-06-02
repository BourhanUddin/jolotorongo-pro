const Room = require("../models/Room");

const ACTIVE_SLOT_STATUSES = ["on_hold", "booked"];

const reserveRoomSlot = async ({ roomId, checkIn, checkOut, status, bookingId, bookingRequestId = null }) => {
  const result = await Room.updateOne(
    {
      _id: roomId,
      isActive: true,
      status: { $ne: "maintenance" },
      availability: {
        $not: {
          $elemMatch: {
            status: { $in: ACTIVE_SLOT_STATUSES },
            checkIn: { $lt: checkOut },
            checkOut: { $gt: checkIn },
          },
        },
      },
    },
    {
      $push: {
        availability: {
          checkIn,
          checkOut,
          status,
          bookingId,
          bookingRequestId,
        },
      },
    }
  );

  return result.modifiedCount === 1;
};

const releaseRoomSlot = ({ roomId, bookingId }) =>
  Room.updateOne(
    { _id: roomId },
    { $pull: { availability: { bookingId } } }
  );

module.exports = { reserveRoomSlot, releaseRoomSlot };
