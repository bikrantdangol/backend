const multer = require("multer");

// Use memory storage — we'll stream the buffer directly to Cloudinary
const storage = multer.memoryStorage();

const MIN_SIZE = 100 * 1024; // 100 KB

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// Attach min-size check as a post-multer middleware
upload.enforceMinSize = (req, res, next) => {
  if (req.file && req.file.size < MIN_SIZE) {
    return res.status(400).json({
      message: `Image must be at least 100 KB. Uploaded file is ${(req.file.size / 1024).toFixed(1)} KB.`,
    });
  }
  next();
};

module.exports = upload;
