const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/leaveController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/roleMiddleware");

// ── User routes ───────────────────────────────────────────────────────────────
router.post("/", protect, ctrl.requestLeave); // submit leave
router.get("/", protect, ctrl.getMyLeaves); // own  /my requests
router.get("/balance", protect, ctrl.getMyLeaveBalance); // balance + carry-forward
router.get("/breakdown", protect, ctrl.getMyMonthlyBreakdown); // month by month
router.get("/history", protect, ctrl.getMyLeaveHistory); // all years

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get("/all", protect, adminOnly, ctrl.getAllLeaves);
router.put("/:id/approve", protect, adminOnly, ctrl.approveLeave);
router.put("/:id/reject", protect, adminOnly, ctrl.rejectLeave);
router.delete("/:id", protect, ctrl.deleteLeave);
module.exports = router;
