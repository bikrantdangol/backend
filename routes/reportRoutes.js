const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/roleMiddleware");

// ── User own reports ────────────────────────────────────────────────────────
router.get("/monthly", protect, ctrl.getMyMonthlyReport);
router.get("/yearly", protect, ctrl.getMyYearlyReport);
router.get("/monthly/pdf", protect, ctrl.downloadMyMonthlyPDF);
router.get("/yearly/pdf", protect, ctrl.downloadMyYearlyPDF);

// ── Admin reports (existing) ─────────────────────────────────────────────────
router.get("/admin/monthly", protect, adminOnly, ctrl.getAdminMonthlyReport);
router.get("/admin/yearly", protect, adminOnly, ctrl.getAdminYearlyReport);
router.get(
  "/admin/all-monthly",
  protect,
  adminOnly,
  ctrl.getAllUsersMonthlyReport,
);
router.get(
  "/admin/pdf/monthly",
  protect,
  adminOnly,
  ctrl.generateUserMonthlyPDF,
);
router.get("/admin/pdf/yearly", protect, adminOnly, ctrl.generateUserYearlyPDF);

// Admin only – generate official monthly report
router.post(
  "/official/monthly",
  protect,
  adminOnly,
  ctrl.generateOfficialMonthlyReport,
);

// Any logged-in user can download the generated report
router.get("/official/:id/download", protect, ctrl.downloadOfficialReport);

module.exports = router;
