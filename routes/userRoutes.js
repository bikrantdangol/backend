const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/roleMiddleware");

// Admin only routes
router.get("/", protect, adminOnly, ctrl.getAllUsers);
router.get("/dashboard-stats", protect, adminOnly, ctrl.getDashboardStats);
router.post("/", protect, adminOnly, ctrl.createUser);
router.get("/:id", protect, adminOnly, ctrl.getUserById);
router.put("/:id", protect, adminOnly, ctrl.updateUser);
router.put("/:id/deactivate", protect, adminOnly, ctrl.deactivateUser);
router.put("/:id/reactivate", protect, adminOnly, ctrl.reactivateUser);
router.delete("/:id", protect, adminOnly, ctrl.deleteUser);

module.exports = router;
