const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/holidayController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/roleMiddleware");

// Public to all logged-in users
router.get("/upcoming", protect, ctrl.getUpcomingHolidays);
router.get("/", protect, ctrl.getHolidaysByYear);

// Admin only

router.post("/", protect, adminOnly, ctrl.addHoliday);
router.put("/:id", protect, adminOnly, ctrl.updateHoliday);
router.delete("/:id", protect, adminOnly, ctrl.deleteHoliday);
// Mass holiday creation (admin only)
router.post("/mass", protect, adminOnly, ctrl.addMassHoliday);
module.exports = router;
