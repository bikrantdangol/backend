const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getMyProfile,
  uploadPhoto,
  updateProfile,
  changePassword,
} = require("../controllers/profileController");

router.get("/me", protect, getMyProfile);
router.post("/upload-photo", protect, upload.single("photo"), uploadPhoto);
router.put("/update", protect, updateProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;
