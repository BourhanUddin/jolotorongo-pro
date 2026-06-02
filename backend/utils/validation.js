const mongoose = require("mongoose");
const { AppError } = require("./appError");

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

const requiredString = (value, label, max = 160) => {
  if (isBlank(value)) throw new AppError(`${label} দিতে হবে।`, 400);
  const normalized = String(value).trim();
  if (normalized.length > max) throw new AppError(`${label} ${max} অক্ষরের মধ্যে হতে হবে।`, 400);
  return normalized;
};

const optionalString = (value, max = 500) => {
  if (isBlank(value)) return "";
  const normalized = String(value).trim();
  if (normalized.length > max) throw new AppError(`টেক্সট ${max} অক্ষরের মধ্যে হতে হবে।`, 400);
  return normalized;
};

const numberValue = (value, label, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new AppError(`${label} সঠিক সংখ্যা হতে হবে।`, 400);
  if (parsed < min || parsed > max) throw new AppError(`${label} ${min} থেকে ${max} এর মধ্যে হতে হবে।`, 400);
  return integer ? Math.trunc(parsed) : parsed;
};

const optionalNumber = (value, label, options) => {
  if (isBlank(value)) return undefined;
  return numberValue(value, label, options);
};

const objectId = (value, label = "আইডি") => {
  if (!mongoose.Types.ObjectId.isValid(value)) throw new AppError(`${label} অবৈধ।`, 400);
  return value;
};

const enumValue = (value, allowed, label) => {
  if (!allowed.includes(value)) throw new AppError(`${label} অবৈধ।`, 400);
  return value;
};

const emailValue = (value) => {
  const email = requiredString(value, "ইমেইল", 180).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError("সঠিক ইমেইল দিন।", 400);
  return email;
};

module.exports = {
  requiredString,
  optionalString,
  numberValue,
  optionalNumber,
  objectId,
  enumValue,
  emailValue,
};
