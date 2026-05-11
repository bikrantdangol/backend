const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const bcrypt = require("bcryptjs");
const streamifier = require("streamifier");

// ── Helper: stream buffer → Cloudinary ───────────────────────────────────────
const streamUpload = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

// ── GET /api/profile/me ───────────────────────────────────────────────────────
const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/profile/upload-photo ────────────────────────────────────────────
// Uploads image buffer to Cloudinary, saves secure_url in MongoDB
const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });

    // Upload buffer to Cloudinary under the "hrms/profiles" folder
    const result = await streamUpload(req.file.buffer, {
      folder: "hrms/profiles",
      public_id: `user_${req.user._id}`, // deterministic — overwrites previous photo
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    // Persist only the secure URL in MongoDB
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { photoUrl: result.secure_url },
      { new: true },
    ).select("-password");

    res.status(200).json({
      message: "Photo uploaded successfully",
      photoUrl: result.secure_url,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/profile/update ───────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, department } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, phone, department },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/profile/change-password ─────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Current password is incorrect" });

    if (newPassword.length < 6)
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.user._id, { password: hashedPassword });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyProfile, uploadPhoto, updateProfile, changePassword };
