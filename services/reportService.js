const User = require("../models/User");
const {
  getMonthlyAttendanceSummary,
  getYearlyAttendanceSummary,
} = require("./attendanceService");
const { getLeaveBalance } = require("./leaveService");
const { generateAttendanceReportPDF } = require("../utils/pdfGenerator");
const { getNepaliMonthName } = require("../utils/nepaliDate");

/**
 * Generate monthly attendance report for a user
 */
const getMonthlyReport = async (userId, nepaliYear, nepaliMonth) => {
  const user = await User.findById(userId).select("-password");
  if (!user) throw new Error("User not found");

  const { summary, records } = await getMonthlyAttendanceSummary(
    userId,
    nepaliYear,
    nepaliMonth,
  );
  const leaveBalance = await getLeaveBalance(userId, nepaliYear);
  const monthName = getNepaliMonthName(nepaliMonth);

  return {
    user,
    period: { type: "monthly", nepaliYear, nepaliMonth, monthName },
    summary,
    leaveBalance,
    records,
  };
};

/**
 * Generate yearly attendance report for a user
 */
const getYearlyReport = async (userId, nepaliYear) => {
  const user = await User.findById(userId).select("-password");
  if (!user) throw new Error("User not found");

  const { summary, records } = await getYearlyAttendanceSummary(
    userId,
    nepaliYear,
  );
  const leaveBalance = await getLeaveBalance(userId, nepaliYear);

  return {
    user,
    period: { type: "yearly", nepaliYear },
    summary,
    leaveBalance,
    records,
  };
};

/**
 * Generate and upload PDF report for a user (monthly)
 * Returns Cloudinary URL
 */
const generateMonthlyPDF = async (userId, nepaliYear, nepaliMonth) => {
  const reportData = await getMonthlyReport(userId, nepaliYear, nepaliMonth);
  const monthName = getNepaliMonthName(nepaliMonth);

  const pdfUrl = await generateAttendanceReportPDF({
    user: reportData.user,
    period: `${monthName} ${nepaliYear}`,
    summary: reportData.summary,
    records: reportData.records,
  });

  return { pdfUrl, reportData };
};

/**
 * Generate and upload PDF report for a user (yearly)
 */
const generateYearlyPDF = async (userId, nepaliYear) => {
  const reportData = await getYearlyReport(userId, nepaliYear);

  const pdfUrl = await generateAttendanceReportPDF({
    user: reportData.user,
    period: `Year ${nepaliYear} BS`,
    summary: reportData.summary,
    records: reportData.records,
  });

  return { pdfUrl, reportData };
};

/**
 * Admin: get summary report of all users for a Nepali month
 */
const getAllUsersMonthlyReport = async (nepaliYear, nepaliMonth) => {
  const users = await User.find({ isAdmin: false, isActive: true }).select(
    "-password",
  );

  const reports = await Promise.all(
    users.map(async (user) => {
      try {
        const { summary } = await getMonthlyAttendanceSummary(
          user._id,
          nepaliYear,
          nepaliMonth,
        );
        return { user, summary };
      } catch {
        return { user, summary: null };
      }
    }),
  );

  return reports;
};

module.exports = {
  getMonthlyReport,
  getYearlyReport,
  generateMonthlyPDF,
  generateYearlyPDF,
  getAllUsersMonthlyReport,
};
