// const express = require("express");
// const PDFDocument = require("pdfkit");
// const mongoose = require("mongoose");
// const router = express.Router();
// const { protect } = require("../middleware/authMiddleware");
// const { adminOnly } = require("../middleware/roleMiddleware");
// const Attendance = require("../models/Attendance");
// const User = require("../models/User");
// const SalaryConfig = require("../models/SalaryConfig");
// const MonthlySalary = require("../models/MonthlySalary");
// const { getADRangeForNepaliMonth } = require("../utils/nepaliDate");

// router.get("/config", protect, adminOnly, async (_req, res) => {
//   try {
//     res.json(await SalaryConfig.getConfig());
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// router.put("/config", protect, adminOnly, async (req, res) => {
//   try {
//     const { bonusEnabled, bonusAmount, overtimeEnabled, overtimeRate } =
//       req.body;
//     const config = await SalaryConfig.getConfig();
//     if (bonusEnabled !== undefined) config.bonusEnabled = Boolean(bonusEnabled);
//     if (bonusAmount !== undefined)
//       config.bonusAmount = Math.max(0, Number(bonusAmount) || 0);
//     if (overtimeEnabled !== undefined)
//       config.overtimeEnabled = Boolean(overtimeEnabled);
//     if (overtimeRate !== undefined)
//       config.overtimeRate = Math.max(0, Number(overtimeRate) || 0);
//     await config.save();
//     res.json(config);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// router.get("/overtime", protect, adminOnly, async (req, res) => {
//   try {
//     const nepaliYear = Number(req.query.nepaliYear);
//     const nepaliMonth = Number(req.query.nepaliMonth);
//     if (!nepaliYear || nepaliMonth < 1 || nepaliMonth > 12)
//       return res
//         .status(400)
//         .json({ message: "Valid nepaliYear and nepaliMonth required" });
//     const { startAD, endAD } = getADRangeForNepaliMonth(
//       nepaliYear,
//       nepaliMonth,
//     );
//     const endInclusive = new Date(endAD);
//     endInclusive.setDate(endInclusive.getDate() + 1);
//     const users = await User.find({ isAdmin: false, isActive: true }).select(
//       "fullName email role baseSalary",
//     );
//     const result = await Promise.all(
//       users.map(async (user) => {
//         const agg = await Attendance.aggregate([
//           {
//             $match: {
//               u: new mongoose.Types.ObjectId(String(user._id)),
//               d: { $gte: startAD, $lt: endInclusive },
//             },
//           },
//           { $group: { _id: null, totalOvertime: { $sum: "$ot" } } },
//         ]);
//         const overtimeMinutes = agg[0]?.totalOvertime || 0;
//         return {
//           _id: user._id,
//           name: user.fullName,
//           role: user.role,
//           baseSalary: user.baseSalary || 0,
//           overtimeMinutes,
//           overtimeHours: Math.round((overtimeMinutes / 60) * 100) / 100,
//         };
//       }),
//     );
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Save or replace this month's payroll. Monetary values are recalculated server-side.
// router.post("/save-monthly", protect, adminOnly, async (req, res) => {
//   try {
//     const nepaliYear = Number(req.body.nepaliYear);
//     const nepaliMonth = Number(req.body.nepaliMonth);
//     const records = req.body.records;
//     if (
//       !nepaliYear ||
//       nepaliMonth < 1 ||
//       nepaliMonth > 12 ||
//       !Array.isArray(records)
//     )
//       return res.status(400).json({
//         message: "nepaliYear, nepaliMonth and records[] are required",
//       });
//     const config = await SalaryConfig.getConfig();
//     const operations = [];
//     for (const record of records) {
//       if (!mongoose.isValidObjectId(record.employeeId))
//         return res
//           .status(400)
//           .json({ message: "Every record needs a valid employeeId" });
//       const employee = await User.findOne({
//         _id: record.employeeId,
//         isAdmin: false,
//         isActive: true,
//       }).select("fullName role baseSalary");
//       if (!employee)
//         return res
//           .status(404)
//           .json({ message: `Active employee not found: ${record.employeeId}` });
//       const requestedBaseSalary = Number(record.baseSalary);
//       if (!Number.isFinite(requestedBaseSalary) || requestedBaseSalary < 0)
//         return res
//           .status(400)
//           .json({ message: "Every record needs a non-negative baseSalary" });
//       const baseSalary = requestedBaseSalary;
//       await User.updateOne({ _id: employee._id }, { $set: { baseSalary } });
//       const bonus = config.bonusEnabled
//         ? Math.max(0, Number(record.bonus) || 0)
//         : 0;
//       const overtimeHours = config.overtimeEnabled
//         ? Math.max(0, Number(record.overtimeHours) || 0)
//         : 0;
//       const staffContribution = Math.round(baseSalary * 0.11 * 100) / 100;
//       const overtimePay =
//         Math.round(overtimeHours * config.overtimeRate * 100) / 100;
//       const socialSecurityFund = Math.round(baseSalary * 0.2 * 100) / 100;
//       const totalSalary =
//         Math.round(
//           (baseSalary - staffContribution + bonus + overtimePay) * 100,
//         ) / 100;
//       operations.push({
//         updateOne: {
//           filter: { employee: employee._id, nepaliYear, nepaliMonth },
//           update: {
//             $set: {
//               employee: employee._id,
//               name: employee.fullName,
//               role: employee.role,
//               baseSalary,
//               socialSecurityFund,
//               staffContribution,
//               bonus,
//               overtimeHours,
//               overtimePay,
//               totalSalary,
//               nepaliYear,
//               nepaliMonth,
//               demo: false,
//             },
//           },
//           upsert: true,
//         },
//       });
//     }
//     if (operations.length)
//       await MonthlySalary.bulkWrite(operations, { ordered: true });
//     const saved = await MonthlySalary.find({
//       nepaliYear,
//       nepaliMonth,
//       demo: { $ne: true },
//     }).sort({ name: 1 });
//     res.json({ message: "Monthly salaries saved", records: saved });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// router.get("/monthly", protect, adminOnly, async (req, res) => {
//   try {
//     const nepaliYear = Number(req.query.nepaliYear);
//     const nepaliMonth = Number(req.query.nepaliMonth);
//     if (!nepaliYear || nepaliMonth < 1 || nepaliMonth > 12)
//       return res
//         .status(400)
//         .json({ message: "Valid nepaliYear and nepaliMonth required" });
//     const records = await MonthlySalary.find({
//       nepaliYear,
//       nepaliMonth,
//       demo: { $ne: true },
//     }).sort({ name: 1 });
//     res.json(records);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // GET /api/salary/history — all saved monthly payroll records, grouped by pay period
// router.get("/history", protect, adminOnly, async (_req, res) => {
//   try {
//     const records = await MonthlySalary.find({ demo: { $ne: true } })
//       .sort({ nepaliYear: -1, nepaliMonth: -1, name: 1 })
//       .lean();

//     const byPeriod = new Map();
//     for (const record of records) {
//       const key = `${record.nepaliYear}-${record.nepaliMonth}`;
//       if (!byPeriod.has(key)) {
//         byPeriod.set(key, {
//           nepaliYear: record.nepaliYear,
//           nepaliMonth: record.nepaliMonth,
//           savedAt: record.updatedAt || record.createdAt || null,
//           totalEmployees: 0,
//           totalPayroll: 0,
//           totalBonus: 0,
//           totalOvertimePay: 0,
//           records: [],
//         });
//       }
//       const period = byPeriod.get(key);
//       period.totalEmployees += 1;
//       period.totalPayroll += Number(record.totalSalary) || 0;
//       period.totalBonus += Number(record.bonus) || 0;
//       period.totalOvertimePay += Number(record.overtimePay) || 0;
//       const recordDate = new Date(record.updatedAt || record.createdAt || 0);
//       const savedDate = new Date(period.savedAt || 0);
//       if (recordDate > savedDate)
//         period.savedAt = record.updatedAt || record.createdAt;
//       period.records.push(record);
//     }

//     res.json({ history: Array.from(byPeriod.values()) });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// router.get(
//   "/receipt/:employeeId/download",
//   protect,
//   adminOnly,
//   async (req, res) => {
//     try {
//       const record = await MonthlySalary.findOne({
//         employee: req.params.employeeId,
//         nepaliYear: Number(req.query.nepaliYear),
//         nepaliMonth: Number(req.query.nepaliMonth),
//       });
//       if (!record)
//         return res
//           .status(404)
//           .json({ message: "Saved salary receipt not found" });
//       const filename = `salary-receipt-${record.employee}-${record.nepaliYear}-${record.nepaliMonth}.pdf`;
//       res.setHeader("Content-Type", "application/pdf");
//       res.setHeader(
//         "Content-Disposition",
//         `attachment; filename="${filename}"`,
//       );
//       const doc = new PDFDocument({ size: "A4", margin: 50 });
//       doc.pipe(res);
//       doc.fontSize(20).text("SALARY RECEIPT", { align: "center" });
//       doc.moveDown().fontSize(12).text(`Employee: ${record.name}`);
//       doc.text(`Role: ${record.role}`);
//       doc.text(`Pay period (BS): ${record.nepaliMonth}/${record.nepaliYear}`);
//       doc.moveDown();
//       const lines = [
//         ["Base Salary (NPR)", record.baseSalary],
//         ["Social Security Fund (20%)", record.socialSecurityFund],
//         ["Staff Contribution (11%)", record.staffContribution],
//         ["Bonus (NPR)", record.bonus],
//         ["Overtime (hours)", record.overtimeHours],
//         ["Overtime Pay (NPR)", record.overtimePay],
//         ["Total Salary (NPR)", record.totalSalary],
//       ];
//       lines.forEach(([label, value]) =>
//         doc.text(`${label}: ${Number(value || 0).toLocaleString("en-NP")}`),
//       );
//       doc.end();
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },
// );

// router.get("/receipt/:employeeId", protect, adminOnly, async (req, res) => {
//   try {
//     const record = await MonthlySalary.findOne({
//       employee: req.params.employeeId,
//       nepaliYear: Number(req.query.nepaliYear),
//       nepaliMonth: Number(req.query.nepaliMonth),
//     });
//     if (!record)
//       return res
//         .status(404)
//         .json({ message: "Saved salary receipt not found" });
//     res.json(record);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// module.exports = router;
const express = require("express");
const PDFDocument = require("pdfkit");
const mongoose = require("mongoose");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/roleMiddleware");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const SalaryConfig = require("../models/SalaryConfig");
const MonthlySalary = require("../models/MonthlySalary");
const { getADRangeForNepaliMonth } = require("../utils/nepaliDate");

router.get("/config", protect, adminOnly, async (_req, res) => {
  try {
    res.json(await SalaryConfig.getConfig());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/config", protect, adminOnly, async (req, res) => {
  try {
    const { bonusEnabled, bonusAmount, overtimeEnabled, overtimeRate } =
      req.body;
    const config = await SalaryConfig.getConfig();
    if (bonusEnabled !== undefined) config.bonusEnabled = Boolean(bonusEnabled);
    if (bonusAmount !== undefined)
      config.bonusAmount = Math.max(0, Number(bonusAmount) || 0);
    if (overtimeEnabled !== undefined)
      config.overtimeEnabled = Boolean(overtimeEnabled);
    if (overtimeRate !== undefined)
      config.overtimeRate = Math.max(0, Number(overtimeRate) || 0);
    await config.save();
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/overtime", protect, adminOnly, async (req, res) => {
  try {
    const nepaliYear = Number(req.query.nepaliYear);
    const nepaliMonth = Number(req.query.nepaliMonth);
    if (!nepaliYear || nepaliMonth < 1 || nepaliMonth > 12)
      return res
        .status(400)
        .json({ message: "Valid nepaliYear and nepaliMonth required" });
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
        const agg = await Attendance.aggregate([
          {
            $match: {
              u: new mongoose.Types.ObjectId(String(user._id)),
              d: { $gte: startAD, $lt: endInclusive },
            },
          },
          { $group: { _id: null, totalOvertime: { $sum: "$ot" } } },
        ]);
        const overtimeMinutes = agg[0]?.totalOvertime || 0;
        return {
          _id: user._id,
          name: user.fullName,
          role: user.role,
          baseSalary: user.baseSalary || 0,
          overtimeMinutes,
          overtimeHours: Math.round((overtimeMinutes / 60) * 100) / 100,
        };
      }),
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save or replace this month's payroll. Monetary values are recalculated server-side.
router.post("/save-monthly", protect, adminOnly, async (req, res) => {
  try {
    const nepaliYear = Number(req.body.nepaliYear);
    const nepaliMonth = Number(req.body.nepaliMonth);
    const records = req.body.records;
    if (
      !nepaliYear ||
      nepaliMonth < 1 ||
      nepaliMonth > 12 ||
      !Array.isArray(records)
    )
      return res.status(400).json({
        message: "nepaliYear, nepaliMonth and records[] are required",
      });
    const config = await SalaryConfig.getConfig();
    const operations = [];
    for (const record of records) {
      if (!mongoose.isValidObjectId(record.employeeId))
        return res
          .status(400)
          .json({ message: "Every record needs a valid employeeId" });
      const employee = await User.findOne({
        _id: record.employeeId,
        isAdmin: false,
        isActive: true,
      }).select("fullName role baseSalary");
      if (!employee)
        return res
          .status(404)
          .json({ message: `Active employee not found: ${record.employeeId}` });
      const requestedBaseSalary = Number(record.baseSalary);
      if (!Number.isFinite(requestedBaseSalary) || requestedBaseSalary < 0)
        return res
          .status(400)
          .json({ message: "Every record needs a non-negative baseSalary" });
      const baseSalary = requestedBaseSalary;
      await User.updateOne({ _id: employee._id }, { $set: { baseSalary } });
      const bonus = config.bonusEnabled
        ? Math.max(0, Number(record.bonus) || 0)
        : 0;
      const overtimeHours = config.overtimeEnabled
        ? Math.max(0, Number(record.overtimeHours) || 0)
        : 0;
      const staffContribution = Math.round(baseSalary * 0.11 * 100) / 100;
      const overtimePay =
        Math.round(overtimeHours * config.overtimeRate * 100) / 100;
      const socialSecurityFund = Math.round(baseSalary * 0.2 * 100) / 100;
      const totalSalary =
        Math.round(
          (baseSalary - staffContribution + bonus + overtimePay) * 100,
        ) / 100;
      operations.push({
        updateOne: {
          filter: { employee: employee._id, nepaliYear, nepaliMonth },
          update: {
            $set: {
              employee: employee._id,
              name: employee.fullName,
              role: employee.role,
              baseSalary,
              socialSecurityFund,
              staffContribution,
              bonus,
              overtimeHours,
              overtimePay,
              totalSalary,
              nepaliYear,
              nepaliMonth,
              demo: false,
            },
          },
          upsert: true,
        },
      });
    }
    if (operations.length)
      await MonthlySalary.bulkWrite(operations, { ordered: true });
    const saved = await MonthlySalary.find({
      nepaliYear,
      nepaliMonth,
      demo: { $ne: true },
    }).sort({ name: 1 });
    res.json({ message: "Monthly salaries saved", records: saved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/monthly", protect, adminOnly, async (req, res) => {
  try {
    const nepaliYear = Number(req.query.nepaliYear);
    const nepaliMonth = Number(req.query.nepaliMonth);
    if (!nepaliYear || nepaliMonth < 1 || nepaliMonth > 12)
      return res
        .status(400)
        .json({ message: "Valid nepaliYear and nepaliMonth required" });
    const records = await MonthlySalary.find({
      nepaliYear,
      nepaliMonth,
      demo: { $ne: true },
    }).sort({ name: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/salary/history — all saved monthly payroll records, grouped by pay period
router.get("/history", protect, adminOnly, async (_req, res) => {
  try {
    const records = await MonthlySalary.find({ demo: { $ne: true } })
      .sort({ nepaliYear: -1, nepaliMonth: -1, name: 1 })
      .lean();

    const byPeriod = new Map();
    for (const record of records) {
      const key = `${record.nepaliYear}-${record.nepaliMonth}`;
      if (!byPeriod.has(key)) {
        byPeriod.set(key, {
          nepaliYear: record.nepaliYear,
          nepaliMonth: record.nepaliMonth,
          savedAt: record.updatedAt || record.createdAt || null,
          totalEmployees: 0,
          totalPayroll: 0,
          totalBonus: 0,
          totalOvertimePay: 0,
          records: [],
        });
      }
      const period = byPeriod.get(key);
      period.totalEmployees += 1;
      period.totalPayroll += Number(record.totalSalary) || 0;
      period.totalBonus += Number(record.bonus) || 0;
      period.totalOvertimePay += Number(record.overtimePay) || 0;
      const recordDate = new Date(record.updatedAt || record.createdAt || 0);
      const savedDate = new Date(period.savedAt || 0);
      if (recordDate > savedDate)
        period.savedAt = record.updatedAt || record.createdAt;
      period.records.push(record);
    }

    res.json({ history: Array.from(byPeriod.values()) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/salary/history — remove a whole saved pay period from history
router.delete("/history", protect, adminOnly, async (req, res) => {
  try {
    const nepaliYear = Number(req.query.nepaliYear);
    const nepaliMonth = Number(req.query.nepaliMonth);
    if (!nepaliYear || nepaliMonth < 1 || nepaliMonth > 12)
      return res
        .status(400)
        .json({ message: "Valid nepaliYear and nepaliMonth required" });
    const result = await MonthlySalary.deleteMany({
      nepaliYear,
      nepaliMonth,
      demo: { $ne: true },
    });
    res.json({ message: "Salary history deleted", deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get(
  "/receipt/:employeeId/download",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const record = await MonthlySalary.findOne({
        employee: req.params.employeeId,
        nepaliYear: Number(req.query.nepaliYear),
        nepaliMonth: Number(req.query.nepaliMonth),
      });
      if (!record)
        return res
          .status(404)
          .json({ message: "Saved salary receipt not found" });
      const filename = `salary-receipt-${record.employee}-${record.nepaliYear}-${record.nepaliMonth}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      doc.pipe(res);
      doc.fontSize(20).text("SALARY RECEIPT", { align: "center" });
      doc.moveDown().fontSize(12).text(`Employee: ${record.name}`);
      doc.text(`Role: ${record.role}`);
      doc.text(`Pay period (BS): ${record.nepaliMonth}/${record.nepaliYear}`);
      doc.moveDown();
      const lines = [
        ["Base Salary (NPR)", record.baseSalary],
        ["Social Security Fund (20%)", record.socialSecurityFund],
        ["Staff Contribution (11%)", record.staffContribution],
        ["Bonus (NPR)", record.bonus],
        ["Overtime (hours)", record.overtimeHours],
        ["Overtime Pay (NPR)", record.overtimePay],
        ["Total Salary (NPR)", record.totalSalary],
      ];
      lines.forEach(([label, value]) =>
        doc.text(`${label}: ${Number(value || 0).toLocaleString("en-NP")}`),
      );
      doc.end();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.get("/receipt/:employeeId", protect, adminOnly, async (req, res) => {
  try {
    const record = await MonthlySalary.findOne({
      employee: req.params.employeeId,
      nepaliYear: Number(req.query.nepaliYear),
      nepaliMonth: Number(req.query.nepaliMonth),
    });
    if (!record)
      return res
        .status(404)
        .json({ message: "Saved salary receipt not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;