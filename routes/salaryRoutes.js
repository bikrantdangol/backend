const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/roleMiddleware");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const SalaryConfig = require("../models/SalaryConfig");
const { getADRangeForNepaliMonth } = require("../utils/nepaliDate");

// GET /api/salary/config – get current salary settings
router.get("/config", protect, adminOnly, async (req, res) => {
  try {
    const config = await SalaryConfig.getConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/salary/config – update settings
router.put("/config", protect, adminOnly, async (req, res) => {
  try {
    const {
      bonusEnabled,
      bonusAmount,
      overtimeEnabled,
      overtimeRate,
      taxRate,
    } = req.body;
    const config = await SalaryConfig.getConfig();
    if (bonusEnabled !== undefined) config.bonusEnabled = bonusEnabled;
    if (bonusAmount !== undefined) config.bonusAmount = bonusAmount;
    if (overtimeEnabled !== undefined) config.overtimeEnabled = overtimeEnabled;
    if (overtimeRate !== undefined) config.overtimeRate = overtimeRate;
    if (taxRate !== undefined) config.taxRate = taxRate;
    await config.save();
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/salary/overtime?nepaliYear=2083&nepaliMonth=1
router.get("/overtime", protect, adminOnly, async (req, res) => {
  try {
    const nepaliYear = parseInt(req.query.nepaliYear);
    const nepaliMonth = parseInt(req.query.nepaliMonth);
    if (!nepaliYear || !nepaliMonth) {
      return res
        .status(400)
        .json({ message: "nepaliYear and nepaliMonth required" });
    }

    const { startAD, endAD } = getADRangeForNepaliMonth(
      nepaliYear,
      nepaliMonth,
    );
    const endInclusive = new Date(endAD);
    endInclusive.setDate(endInclusive.getDate() + 1);
    const users = await User.find({ isAdmin: false, isActive: true }).select(
      "fullName email role baseSalary",
    );

    const result = await Promise.all(
      users.map(async (user) => {
        const userId = new mongoose.Types.ObjectId(String(user._id));
        const agg = await Attendance.aggregate([
          { $match: { u: userId, d: { $gte: startAD, $lt: endInclusive } } },
          { $group: { _id: null, totalOvertime: { $sum: "$ot" } } },
        ]);
        const totalOvertimeMinutes = agg[0]?.totalOvertime || 0;
        return {
          _id: user._id,
          name: user.fullName,
          role: user.role,
          baseSalary: user.baseSalary || 0,
          overtimeMinutes: totalOvertimeMinutes,
          overtimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
        };
      }),
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;