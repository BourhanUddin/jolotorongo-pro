const { AppError } = require("../utils/appError");

const handleCastErrorDB = (err) =>
  new AppError(`অবৈধ ${err.path}: ${err.value}`, 400);

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
  return new AppError(`এই মান ইতিমধ্যে ব্যবহৃত হয়েছে: ${value}। অন্য মান দিন।`, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  return new AppError(`ইনপুট ত্রুটি: ${errors.join(". ")}`, 400);
};

const handleJWTError = () =>
  new AppError("টোকেন অবৈধ। আবার লগইন করুন।", 401);

const handleJWTExpiredError = () =>
  new AppError("টোকেনের মেয়াদ শেষ। আবার লগইন করুন।", 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }
  console.error("❌ অপ্রত্যাশিত ত্রুটি:", err);
  res.status(500).json({
    success: false,
    message: "কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।",
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else {
    let error = { ...err, message: err.message };
    if (err.name === "CastError") error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === "ValidationError") error = handleValidationErrorDB(error);
    if (err.name === "JsonWebTokenError") error = handleJWTError();
    if (err.name === "TokenExpiredError") error = handleJWTExpiredError();
    sendErrorProd(error, res);
  }
};
