// ==================== authRoutes.js ====================
const express = require("express");
const router = express.Router();
const {
  register,
  login,
  updatePassword,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register-admin", register); // One-time admin registration
router.post("/login", login); // Login (admin + users)
router.get("/me", protect, getMe); // Get current user
router.put("/change-password", protect, updatePassword); // Change own password

module.exports = router;
