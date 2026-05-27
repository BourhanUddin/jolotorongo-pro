const { AppError } = require("../utils/appError");

const isMultipart = (req) => req.headers["content-type"]?.includes("multipart/form-data");

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

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return next(new AppError("Cloudinary env configuration missing.", 500));
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

module.exports = { uploadRoomImages };
