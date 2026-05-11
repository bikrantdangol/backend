const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/occasionController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/roleMiddleware");

// All logged-in users
router.get("/", protect, ctrl.getAllOccasions);
router.get("/upcoming", protect, ctrl.getUpcomingOccasions);
router.get("/user/:userId", protect, ctrl.getUserOccasions);

// Admin only
router.post("/", protect, adminOnly, ctrl.addOccasion);
router.put("/:id", protect, adminOnly, ctrl.updateOccasion);
router.delete("/:id", protect, adminOnly, ctrl.deleteOccasion);

module.exports = router;
