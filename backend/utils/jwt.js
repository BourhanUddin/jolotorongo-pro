const jwt = require("jsonwebtoken");

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

/**
 * Send a signed JWT inside a JSON response.
 * Strips password from the user object.
 */
const sendTokenResponse = (user, statusCode, res, message = "সফল") => {
  const token = signToken(user._id);
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    message,
    token,
    data: { user: userObj },
  });
};

module.exports = { signToken, verifyToken, sendTokenResponse };
