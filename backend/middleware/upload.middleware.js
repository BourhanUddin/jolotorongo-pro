const { AppError } = require("../utils/appError");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const isMultipart = (req) => req.headers["content-type"]?.includes("multipart/form-data");
const hasCloudinaryEnv = () =>
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

const saveLocalUpload = async (file, folder) => {
  const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
  const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`;
  const dir = path.resolve(__dirname, "../uploads", folder);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, fileName), file.buffer);
  return `/uploads/${folder}/${fileName}`;
};

const uploadRoomImages = async (req, res, next) => {
  if (!isMultipart(req)) return next();

  let multer;
  let cloudinary;
  try {
    multer = require("multer");
    cloudinary = require("cloudinary").v2;
  } catch (err) {
    return next(
      new AppError(
        "ইমেজ আপলোডের জন্য multer এবং cloudinary প্যাকেজ ইনস্টল করতে হবে।",
        500
      )
    );
  }

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 8, fileSize: 5 * 1024 * 1024 },
  }).array("images", 8);

  upload(req, res, async (err) => {
    if (err) return next(new AppError(err.message || "ইমেজ আপলোড ব্যর্থ হয়েছে।", 400));

    if (!req.files?.length) {
      req.uploadedImageUrls = [];
      return next();
    }

    if (!hasCloudinaryEnv()) {
      try {
        req.uploadedImageUrls = await Promise.all(req.files.map((file) => saveLocalUpload(file, "rooms")));
        return next();
      } catch (error) {
        return next(new AppError(error.message || "Local room image save failed.", 500));
      }
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadBuffer = (file) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "jolotorongo/rooms", resource_type: "image" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );
        stream.end(file.buffer);
      });

    try {
      req.uploadedImageUrls = await Promise.all(req.files.map(uploadBuffer));
      next();
    } catch (error) {
      next(new AppError(error.message || "Cloudinary upload failed.", 500));
    }
  });
};

const uploadPaymentScreenshot = async (req, res, next) => {
  if (!isMultipart(req)) return next();

  let multer;
  let cloudinary;
  try {
    multer = require("multer");
    cloudinary = require("cloudinary").v2;
  } catch (err) {
    return next(new AppError("পেমেন্ট স্ক্রিনশট আপলোডের জন্য multer এবং cloudinary প্যাকেজ দরকার।", 500));
  }

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: 5 * 1024 * 1024 },
  }).single("screenshot");

  upload(req, res, async (err) => {
    if (err) return next(new AppError(err.message || "পেমেন্ট স্ক্রিনশট আপলোড ব্যর্থ হয়েছে।", 400));
    if (!req.file) return next();

    if (!hasCloudinaryEnv()) {
      try {
        req.paymentScreenshotUrl = await saveLocalUpload(req.file, "subscription-payments");
        return next();
      } catch (error) {
        return next(new AppError(error.message || "Local payment screenshot save failed.", 500));
      }
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadBuffer = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "jolotorongo/subscription-payments", resource_type: "image" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );
        stream.end(req.file.buffer);
      });

    try {
      req.paymentScreenshotUrl = await uploadBuffer();
      next();
    } catch (error) {
      next(new AppError(error.message || "Cloudinary upload failed.", 500));
    }
  });
};

module.exports = { uploadRoomImages, uploadPaymentScreenshot };
