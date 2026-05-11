// // const express = require("express");
// // const router = express.Router();
// // const ctrl = require("../controllers/attendanceController");
// // const { protect } = require("../middleware/authMiddleware");
// // const { adminOnly } = require("../middleware/roleMiddleware");

// // // User routes
// // router.post("/check-in", protect, ctrl.checkIn);
// // router.post("/check-out", protect, ctrl.checkOut);
// // router.get("/today", protect, ctrl.getTodayAttendance);
// // router.get("/my", protect, ctrl.getMyAttendance);

// // // Admin routes
// // router.get("/all", protect, adminOnly, ctrl.getAllUsersAttendance);
// // router.get("/user/:userId", protect, adminOnly, ctrl.getUserAttendance);

// // module.exports = router;
// const express = require("express");
// const router = express.Router();
// const ctrl = require("../controllers/attendanceController");
// const { protect } = require("../middleware/authMiddleware");
// const { adminOnly } = require("../middleware/roleMiddleware");

// // User routes
// router.post("/check-in", protect, ctrl.checkIn);
// router.post("/check-out", protect, ctrl.checkOut);
// router.get("/today", protect, ctrl.getTodayAttendance);
// router.get("/current-period", protect, ctrl.getCurrentPeriod); // returns current BS year/month
// router.get("/my", protect, ctrl.getMyAttendance);
// router.get("/history", protect, ctrl.getMyAttendanceHistory); // full history by BS year

// // Admin routes
// router.get("/all", protect, adminOnly, ctrl.getAllUsersAttendance);
// router.get("/user/:userId", protect, adminOnly, ctrl.getUserAttendance);
// router.get(
//   "/user/:userId/history",
//   protect,
//   adminOnly,
//   ctrl.getUserAttendanceHistory,
// );

// module.exports = router;
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/roleMiddleware");

// ── User (own data) ───────────────────────────────────────────────────────────
router.get("/today", protect, ctrl.getTodayAttendance);
router.get("/current-period", protect, ctrl.getCurrentPeriod);
router.get("/my", protect, ctrl.getMyAttendance); // ?startDate= &endDate=
router.get("/my/summary", protect, ctrl.getMyMonthlySummary); // ?nepaliYear= &nepaliMonth=
router.get("/history", protect, ctrl.getMyAttendanceHistory);

// ── Admin (any user's data) ───────────────────────────────────────────────────
router.get("/all", protect, adminOnly, ctrl.getAllUsersAttendance); // ?date=
router.get("/user/:userId", protect, adminOnly, ctrl.getUserAttendance); // ?startDate= &endDate=
router.get(
  "/user/:userId/summary",
  protect,
  adminOnly,
  ctrl.getUserMonthlySummary,
); // ?nepaliYear= &nepaliMonth=
router.get(
  "/user/:userId/history",
  protect,
  adminOnly,
  ctrl.getUserAttendanceHistory,
);

module.exports = router;
