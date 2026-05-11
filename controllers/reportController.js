const Report = require("../models/Report");
const { generateAttendanceReportPDF } = require("../services/pdfService");
const reportService = require("../services/reportService");
const { NEPALI_MONTHS } = require("../utils/nepaliDate");

// ── Existing user endpoints ──────────────────────────────────────────────────
const getMyMonthlyReport = async (req, res, next) => {
  try {
    const { nepaliYear, nepaliMonth } = req.query;
    if (!nepaliYear || !nepaliMonth)
      return res
        .status(400)
        .json({ message: "nepaliYear and nepaliMonth are required" });
    const report = await reportService.getMonthlyReport(
      req.user._id,
      Number(nepaliYear),
      Number(nepaliMonth),
    );
    res.status(200).json({ report });
  } catch (err) {
    next(err);
  }
};

const getMyYearlyReport = async (req, res, next) => {
  try {
    const { nepaliYear } = req.query;
    if (!nepaliYear)
      return res.status(400).json({ message: "nepaliYear is required" });
    const report = await reportService.getYearlyReport(
      req.user._id,
      Number(nepaliYear),
    );
    res.status(200).json({ report });
  } catch (err) {
    next(err);
  }
};

const downloadMyMonthlyPDF = async (req, res, next) => {
  try {
    const { nepaliYear, nepaliMonth } = req.query;
    const { pdfUrl } = await reportService.generateMonthlyPDF(
      req.user._id,
      Number(nepaliYear),
      Number(nepaliMonth),
    );
    res.status(200).json({ pdfUrl });
  } catch (err) {
    next(err);
  }
};

const downloadMyYearlyPDF = async (req, res, next) => {
  try {
    const { nepaliYear } = req.query;
    const { pdfUrl } = await reportService.generateYearlyPDF(
      req.user._id,
      Number(nepaliYear),
    );
    res.status(200).json({ pdfUrl });
  } catch (err) {
    next(err);
  }
};

// ── Admin existing endpoints ──────────────────────────────────────────────────
const getAdminMonthlyReport = async (req, res, next) => {
  try {
    const { nepaliYear, nepaliMonth, userId } = req.query;
    if (!nepaliYear || !nepaliMonth || !userId)
      return res
        .status(400)
        .json({ message: "nepaliYear, nepaliMonth, and userId are required" });
    const report = await reportService.getMonthlyReport(
      userId,
      Number(nepaliYear),
      Number(nepaliMonth),
    );
    res.status(200).json({ report });
  } catch (err) {
    next(err);
  }
};

const getAdminYearlyReport = async (req, res, next) => {
  try {
    const { nepaliYear, userId } = req.query;
    if (!nepaliYear || !userId)
      return res
        .status(400)
        .json({ message: "nepaliYear and userId are required" });
    const report = await reportService.getYearlyReport(
      userId,
      Number(nepaliYear),
    );
    res.status(200).json({ report });
  } catch (err) {
    next(err);
  }
};

const getAllUsersMonthlyReport = async (req, res, next) => {
  try {
    const { nepaliYear, nepaliMonth } = req.query;
    if (!nepaliYear || !nepaliMonth)
      return res
        .status(400)
        .json({ message: "nepaliYear and nepaliMonth are required" });
    const reports = await reportService.getAllUsersMonthlyReport(
      Number(nepaliYear),
      Number(nepaliMonth),
    );
    res.status(200).json({ reports });
  } catch (err) {
    next(err);
  }
};

const generateUserMonthlyPDF = async (req, res, next) => {
  try {
    const { nepaliYear, nepaliMonth, userId } = req.query;
    const { pdfUrl } = await reportService.generateMonthlyPDF(
      userId,
      Number(nepaliYear),
      Number(nepaliMonth),
    );
    res.status(200).json({ pdfUrl });
  } catch (err) {
    next(err);
  }
};

const generateUserYearlyPDF = async (req, res, next) => {
  try {
    const { nepaliYear, userId } = req.query;
    const { pdfUrl } = await reportService.generateYearlyPDF(
      userId,
      Number(nepaliYear),
    );
    res.status(200).json({ pdfUrl });
  } catch (err) {
    next(err);
  }
};

// ── NEW: Official monthly report (all employees) stored in MongoDB ────────────
const generateOfficialMonthlyReport = async (req, res, next) => {
  try {
    const { nepaliYear, nepaliMonth } = req.query;
    if (!nepaliYear || !nepaliMonth)
      return res
        .status(400)
        .json({ message: "nepaliYear and nepaliMonth are required" });

    // Use the existing helper to get the month name
    const { getNepaliMonthName } = require("../utils/nepaliDate");
    const reports = await reportService.getAllUsersMonthlyReport(
      Number(nepaliYear),
      Number(nepaliMonth),
    );

    const records = [];
    const employees = [];
    let totalPresent = 0,
      totalAbsent = 0,
      totalLate = 0;

    reports.forEach((r) => {
      employees.push({
        fullName: r.user?.fullName || "Unknown",
        role: r.user?.role || "staff",
        present: r.summary.presentDays || 0,
        late: r.summary.lateDays || 0,
        absent: r.summary.absentDays || 0,
      });

      (r.records || []).forEach((rec) =>
        records.push({ ...rec, userName: r.user?.fullName || "Unknown" }),
      );
      totalPresent += r.summary.presentDays || 0;
      totalAbsent += r.summary.absentDays || 0;
      totalLate += r.summary.lateDays || 0;
    });

    const period = `${getNepaliMonthName(nepaliMonth)} ${nepaliYear}`;
    const summary = {
      totalDays: totalPresent + totalAbsent,
      presentDays: totalPresent,
      absentDays: totalAbsent,
      lateDays: totalLate,
      earlyLeaveDays: 0,
      leaveDays: 0,
      holidayDays: 0,
    };

    const pdfBuffer = await generateAttendanceReportPDF({
      user: { fullName: "Admin", role: "admin", email: req.user.email },
      period,
      summary,
      employees,
      records,
    });

    const report = await Report.create({
      title: `Official Attendance Report - ${period}`,
      user: req.user._id,
      pdfData: pdfBuffer,
      period,
      summary,
    });

    res.status(201).json({
      message: "Official report generated",
      reportId: report._id,
      downloadUrl: `/api/reports/official/${report._id}/download`,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/official/:id/download
const downloadOfficialReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.title}.pdf"`,
    });
    res.send(report.pdfData);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyMonthlyReport,
  getMyYearlyReport,
  downloadMyMonthlyPDF,
  downloadMyYearlyPDF,
  getAdminMonthlyReport,
  getAdminYearlyReport,
  getAllUsersMonthlyReport,
  generateUserMonthlyPDF,
  generateUserYearlyPDF,
  generateOfficialMonthlyReport,
  downloadOfficialReport,
};
