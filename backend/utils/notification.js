const User = require("../models/User");

/**
 * Push an in-app notification to one or more users.
 * @param {string|string[]} userIds  - single ObjectId or array
 * @param {string}          message  - notification text (Bangla OK)
 * @param {string}          type     - 'info' | 'warning' | 'success' | 'error'
 */
const pushNotification = async (userIds, message, type = "info") => {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const notification = { message, type, isRead: false, createdAt: new Date() };

  await User.updateMany(
    { _id: { $in: ids } },
    { $push: { notifications: { $each: [notification], $slice: -50 } } }
    // Keep last 50 notifications per user
  );
};

module.exports = { pushNotification };
