const crypto = require("crypto");
const { AppError } = require("./appError");

const otpStore = new Map();
const verifiedStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 15 * 60 * 1000;

const normalizeIdentifier = (value) => {
  const raw = String(value || "").trim();
  if (!raw) throw new AppError("ইমেইল বা ফোন নম্বর দিন।", 400);
  if (raw.includes("@")) return raw.toLowerCase();
  return raw.replace(/[^\d+]/g, "");
};

const identifierType = (identifier) => (identifier.includes("@") ? "email" : "phone");

const makeKey = (identifier, purpose) => `${purpose}:${normalizeIdentifier(identifier)}`;

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

const sendOtp = async ({ identifier, type, code, purpose }) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`OTP (${purpose}) for ${identifier}: ${code}`);
    return;
  }

  const endpoint = type === "email" ? process.env.OTP_EMAIL_WEBHOOK_URL : process.env.OTP_SMS_WEBHOOK_URL;
  if (!endpoint) {
    throw new AppError("OTP পাঠানোর সার্ভিস কনফিগার করা নেই।", 500);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, type, code, purpose }),
  });
  if (!response.ok) {
    throw new AppError("OTP পাঠানো যায়নি। আবার চেষ্টা করুন।", 502);
  }
};

const createOtp = async (identifier, purpose = "login") => {
  const normalized = normalizeIdentifier(identifier);
  const type = identifierType(normalized);
  const code = process.env.DEMO_OTP_CODE || (process.env.NODE_ENV === "production"
    ? String(crypto.randomInt(100000, 999999))
    : "123456");
  otpStore.set(makeKey(normalized, purpose), {
    codeHash: hash(code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });

  await sendOtp({ identifier: normalized, type, code, purpose });

  return {
    identifier: normalized,
    type,
    demoOtp: process.env.NODE_ENV === "production" ? undefined : code,
  };
};

const verifyOtp = (identifier, otp, purpose = "login") => {
  const normalized = normalizeIdentifier(identifier);
  const key = makeKey(normalized, purpose);
  const record = otpStore.get(key);
  if (!record || record.expiresAt < Date.now()) {
    otpStore.delete(key);
    throw new AppError("OTP মেয়াদ শেষ হয়েছে। আবার OTP নিন।", 400);
  }

  if (record.attempts >= 5) {
    otpStore.delete(key);
    throw new AppError("অনেকবার ভুল OTP দেওয়া হয়েছে। নতুন OTP নিন।", 429);
  }

  record.attempts += 1;
  if (record.codeHash !== hash(String(otp || "").trim())) {
    throw new AppError("OTP ভুল।", 400);
  }

  otpStore.delete(key);
  const token = crypto.randomBytes(24).toString("hex");
  verifiedStore.set(token, {
    identifier: normalized,
    purpose,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });

  return { otpToken: token, identifier: normalized, type: identifierType(normalized) };
};

const consumeOtpToken = (otpToken, identifier, purpose = "login") => {
  const normalized = normalizeIdentifier(identifier);
  const record = verifiedStore.get(String(otpToken || ""));
  if (!record || record.expiresAt < Date.now()) {
    verifiedStore.delete(String(otpToken || ""));
    throw new AppError("OTP ভেরিফিকেশন মেয়াদ শেষ হয়েছে।", 400);
  }
  if (record.identifier !== normalized || record.purpose !== purpose) {
    throw new AppError("OTP ভেরিফিকেশন মিলছে না।", 400);
  }
  verifiedStore.delete(String(otpToken));
  return { identifier: normalized, type: identifierType(normalized) };
};

module.exports = {
  createOtp,
  verifyOtp,
  consumeOtpToken,
  normalizeIdentifier,
  identifierType,
};
