const Leave = require("../models/Leave");
const Holiday = require("../models/Holiday");
const User = require("../models/User");
const {
  toNepaliDate,
  getNepaliYear,
  getNepaliMonth,
  currentNepaliPeriod,
  nepaliToAD, // Add this import
} = require("../utils/nepaliDate");
const { countWorkingDays } = require("../utils/attendanceHelper");
const {
  createLeaveRequestedNotif,
  createLeaveApprovedNotif,
  createLeaveRejectedNotif,
} = require("./notificationService");
const Notification = require("../models/Notification");
const LEAVES_PER_YEAR = 12;
const LEAVES_PER_MONTH = 1;

// ─── Leave balance with carry-forward ─────────────────────────────────────────

const getLeaveBalance = async (userId, nepaliYear) => {
  const period = currentNepaliPeriod();
  const year = nepaliYear ? Number(nepaliYear) : period.year;
  const currentMonth = year === period.year ? period.month : 12;
  const accrued = Math.min(currentMonth * LEAVES_PER_MONTH, LEAVES_PER_YEAR);

  const leaves = await Leave.find({
    user: userId,
    leaveYear: year,
    status: { $in: ["approved", "pending"] },
  });
  const usedDays = leaves.reduce((sum, l) => sum + l.totalDays, 0);

  return {
    year,
    totalPerYear: LEAVES_PER_YEAR,
    accruedSoFar: accrued,
    used: usedDays,
    availableNow: Math.max(0, accrued - usedDays),
    remainingForYear: Math.max(0, LEAVES_PER_YEAR - usedDays),
    currentMonth,
    monthsLeft: LEAVES_PER_YEAR - currentMonth,
  };
};

// ─── Request leave ────────────────────────────────────────────────────────────

const requestLeave = async (
  userId,
  { fromDate, toDate, reason, leaveType },
) => {
  // Convert Nepali date strings (YYYY-MM-DD) to AD dates
  // fromDate looks like "2083-01-24" (BS year-month-day)
  let from, to;

  try {
    from = nepaliToAD(fromDate);
    to = nepaliToAD(toDate);
  } catch (err) {
    throw new Error("Invalid date format. Please select valid dates.");
  }

  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  if (from > to) throw new Error("From date cannot be after To date");

  // Get holidays in range
  const holidays = await Holiday.find({ date: { $gte: from, $lte: to } });
  const holidayDates = holidays.map((h) => h.date);

  // Count working days
  const totalDays = countWorkingDays(from, to, holidayDates);

  if (totalDays === 0) {
    throw new Error(
      "No working days in the selected range (weekends and holidays are excluded)",
    );
  }

  const leaveYear = getNepaliYear(from);
  const leaveMonth = getNepaliMonth(from);

  // Check overlap
  const overlapping = await Leave.findOne({
    user: userId,
    status: { $in: ["approved", "pending"] },
    fromDate: { $lte: to },
    toDate: { $gte: from },
  });
  if (overlapping) {
    throw new Error("You already have a leave request overlapping these dates");
  }

  // Check balance
  const balance = await getLeaveBalance(userId, leaveYear);

  // ADD THIS NEW CHECK – enforce absolute 12‑day yearly maximum
  if (balance.used + totalDays > LEAVES_PER_YEAR) {
    throw new Error(
      `You can only take a total of ${LEAVES_PER_YEAR} days in a year. You have already used or have pending ${balance.used} day(s).`,
    );
  }

  // Allow submission even if balance is exceeded (carry-forward handles it)
  // The frontend shows a disclaimer to the user before submitting

  const leave = await Leave.create({
    user: userId,
    fromDate: from,
    toDate: to,
    fromDateNepali: toNepaliDate(from),
    toDateNepali: toNepaliDate(to),
    totalDays,
    reason,
    leaveType: leaveType || "casual",
    leaveYear,
    leaveMonth,
    status: "pending",
  });

  const user = await User.findById(userId).select("fullName").lean();
  await createLeaveRequestedNotif(leave, user).catch((e) =>
    console.error("[Notif] leave requested:", e.message),
  );

  return leave;
};

// ─── Get user leaves ──────────────────────────────────────────────────────────

const getUserLeaves = async (userId, filters = {}) => {
  const query = { user: userId };
  if (filters.status) query.status = filters.status;
  if (filters.leaveYear) query.leaveYear = Number(filters.leaveYear);
  return await Leave.find(query)
    .populate("processedBy", "fullName")
    .sort({ createdAt: -1 });
};

// ─── Get all leaves (admin) ───────────────────────────────────────────────────

const getAllLeaves = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.userId) query.user = filters.userId;
  if (filters.leaveYear) query.leaveYear = Number(filters.leaveYear);
  return await Leave.find(query)
    .populate("user", "fullName email role")
    .populate("processedBy", "fullName")
    .sort({ createdAt: -1 });
};

// ─── Approve ──────────────────────────────────────────────────────────────────

const approveLeave = async (leaveId, adminId, adminNote = "") => {
  const leave = await Leave.findById(leaveId);
  if (!leave) throw new Error("Leave request not found");
  if (leave.status !== "pending")
    throw new Error("This leave request is already processed");

  leave.status = "approved";
  leave.processedBy = adminId;
  leave.processedAt = new Date();
  leave.adminNote = adminNote;
  await leave.save();

  await createLeaveApprovedNotif(leave).catch((e) =>
    console.error("[Notif] leave approved:", e.message),
  );

  return leave;
};

// ─── Reject ───────────────────────────────────────────────────────────────────

const rejectLeave = async (leaveId, adminId, adminNote) => {
  const leave = await Leave.findById(leaveId);
  if (!leave) throw new Error("Leave request not found");
  if (leave.status !== "pending")
    throw new Error("This leave request is already processed");

  leave.status = "rejected";
  leave.processedBy = adminId;
  leave.processedAt = new Date();
  leave.adminNote = adminNote || "";
  await leave.save();

  await createLeaveRejectedNotif(leave).catch((e) =>
    console.error("[Notif] leave rejected:", e.message),
  );

  return leave;
};

// ─── History ──────────────────────────────────────────────────────────────────

const getUserLeaveHistory = async (userId) => {
  const leaves = await Leave.find({ user: userId }).sort({
    leaveYear: -1,
    createdAt: -1,
  });
  const byYear = {};
  leaves.forEach((l) => {
    if (!byYear[l.leaveYear])
      byYear[l.leaveYear] = {
        year: l.leaveYear,
        leaves: [],
        totalDays: 0,
        approvedDays: 0,
        pendingDays: 0,
      };
    byYear[l.leaveYear].leaves.push(l);
    byYear[l.leaveYear].totalDays += l.totalDays;
    if (l.status === "approved")
      byYear[l.leaveYear].approvedDays += l.totalDays;
    if (l.status === "pending") byYear[l.leaveYear].pendingDays += l.totalDays;
  });
  return Object.values(byYear).sort((a, b) => b.year - a.year);
};

// ─── Monthly breakdown ────────────────────────────────────────────────────────

const getMonthlyBreakdown = async (userId, nepaliYear) => {
  const period = currentNepaliPeriod();
  const year = nepaliYear ? Number(nepaliYear) : period.year;
  const leaves = await Leave.find({
    user: userId,
    leaveYear: year,
    status: { $in: ["approved", "pending"] },
  });

  const MONTH_NAMES = [
    "Baisakh",
    "Jestha",
    "Ashadh",
    "Shrawan",
    "Bhadra",
    "Ashwin",
    "Kartik",
    "Mangsir",
    "Poush",
    "Magh",
    "Falgun",
    "Chaitra",
  ];
  const monthUsage = Array(12).fill(0);
  leaves.forEach((l) => {
    const m = (l.leaveMonth || 1) - 1;
    monthUsage[m] += l.totalDays;
  });

  let carryForward = 0;
  const months = MONTH_NAMES.map((name, i) => {
    const allocated = LEAVES_PER_MONTH + carryForward;
    const used = monthUsage[i];
    const remaining = Math.max(0, allocated - used);
    carryForward = remaining;
    return {
      month: i + 1,
      name,
      allocated,
      used,
      remaining,
      isPast: i + 1 < period.month && year === period.year,
      isCurrent: i + 1 === period.month && year === period.year,
    };
  });

  return { year, months };
};
const deleteLeave = async (leaveId) => {
  const leave = await Leave.findByIdAndDelete(leaveId);
  if (!leave) throw new Error("Leave request not found");

  // clean up related notifications
  await Notification.deleteMany({ refModel: "Leave", refId: leaveId });

  return { message: "Leave request deleted successfully" };
};

module.exports = {
  requestLeave,
  getUserLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  deleteLeave,
  getLeaveBalance,
  getUserLeaveHistory,
  getMonthlyBreakdown,
};
