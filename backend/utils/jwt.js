const jwt = require("jsonwebtoken");

const normalizeExpiresIn = (value) => {
  const fallback = "7d";
  if (value === undefined || value === null) return fallback;

  const normalized = String(value).trim().replace(/^['"]|['"]$/g, "").trim();
  if (!normalized) return fallback;
  if (/^\d+$/.test(normalized)) return Number(normalized);

  return normalized;
};

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: normalizeExpiresIn(process.env.JWT_EXPIRES_IN),
  });

const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const attachTokenCookie = (res, token) => {
  res.cookie("jt_token", token, cookieOptions());
};

const clearTokenCookie = (res) => {
  res.clearCookie("jt_token", cookieOptions());
};

/**
 * Send a signed JWT inside a JSON response.
 * Strips password from the user object.
 */
const sendTokenResponse = (user, statusCode, res, message = "সফল") => {
  const token = signToken(user._id);
  attachTokenCookie(res, token);
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    message,
    token,
    data: { user: userObj },
  });
};

module.exports = { signToken, verifyToken, sendTokenResponse, attachTokenCookie, clearTokenCookie };
