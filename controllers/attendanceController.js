const Attendance = require("../models/Attendance");
const User = require("../models/User");
const attendanceService = require("../services/attendanceService");
const { currentNepaliPeriod } = require("../utils/nepaliDate");

const fmt = (doc) => {
  const STATUS_LABEL = {
    P: "present",
    A: "absent",
    H: "half-day",
    L: "on-leave",
    X: "holiday",
    W: "weekend",
  };
  return {
    _id: doc._id,
    date: doc.d,
    nepaliDate: doc.nd,
    checkIn: doc.ci,
    checkOut: doc.co,
    workingMinutes: doc.wm,
    overtimeMinutes: doc.ot || 0,
    status: STATUS_LABEL[doc.st] || doc.st,
    isLate: doc.lt,
    isEarlyLeave: doc.el,
    source:
      doc.src === "b" ? "biometric" : doc.src === "m" ? "manual" : "system",
  };
};

// GET /api/attendance/today
const getTodayAttendance = async (req, res, next) => {
  try {
    // Use NPT date for "today" so it matches how zkService stores dates
    const NPT_OFFSET_MS = 345 * 60 * 1000;
    const nowNPT = new Date(Date.now() + NPT_OFFSET_MS);
    const todayStr = nowNPT.toISOString().slice(0, 10); // "2026-05-06" in NPT
    const today = new Date(todayStr + "T00:00:00.000Z"); // UTC midnight
    const doc = await Attendance.findOne({ u: req.user._id, d: today }).lean();
    res.json({ record: doc ? fmt(doc) : null });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/my?startDate=2026-04-01&endDate=2026-04-30
const getMyAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate)
      return res
        .status(400)
        .json({ message: "startDate and endDate required" });
    const docs = await Attendance.find({
      u: req.user._id,
      d: { $gte: new Date(startDate), $lte: new Date(endDate) },
    })
      .lean()
      .sort({ d: 1 });
    res.json({ records: docs.map(fmt) });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/my/summary?nepaliYear=2083&nepaliMonth=1
const getMyMonthlySummary = async (req, res, next) => {
  try {
    const period = currentNepaliPeriod();
    const nepaliYear = parseInt(req.query.nepaliYear) || period.year;
    const nepaliMonth = parseInt(req.query.nepaliMonth) || period.month;
    const { summary, records } =
      await attendanceService.getMonthlyAttendanceSummary(
        req.user._id,
        nepaliYear,
        nepaliMonth,
      );
    res.json({
      nepaliYear,
      nepaliMonth,
      summary,
      records: records.map((r) => fmt(r.toObject ? r.toObject() : r)),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/history
const getMyAttendanceHistory = async (req, res, next) => {
  try {
    const history = await attendanceService.getUserAttendanceHistory(
      req.user._id,
    );
    res.json({ history });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/current-period
const getCurrentPeriod = (req, res) => {
  res.json({ period: currentNepaliPeriod() });
};

// GET /api/attendance/all?date=2026-05-01
const getAllUsersAttendance = async (req, res, next) => {
  try {
    const NPT_OFFSET_MS = 345 * 60 * 1000;
    const rawDate = req.query.date
      ? new Date(req.query.date + "T00:00:00.000Z")
      : new Date(
          new Date(Date.now() + NPT_OFFSET_MS).toISOString().slice(0, 10) +
            "T00:00:00.000Z",
        );
    const date = rawDate;
    const docs = await Attendance.find({ d: date })
      .lean()
      .populate("u", "fullName email role biometricId");
    res.json({
      date: date.toISOString().slice(0, 10),
      count: docs.length,
      records: docs.map((doc) => ({ ...fmt(doc), user: doc.u })),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/user/:userId?startDate=2026-04-01&endDate=2026-04-30
const getUserAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate)
      return res
        .status(400)
        .json({ message: "startDate and endDate required" });
    const user = await User.findById(req.params.userId)
      .select("fullName email role biometricId joinedDate")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    const docs = await Attendance.find({
      u: req.params.userId,
      d: { $gte: new Date(startDate), $lte: new Date(endDate) },
    })
      .lean()
      .sort({ d: 1 });
    res.json({ user, records: docs.map(fmt) });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/user/:userId/summary?nepaliYear=2083&nepaliMonth=1
const getUserMonthlySummary = async (req, res, next) => {
  try {
    const period = currentNepaliPeriod();
    const nepaliYear = parseInt(req.query.nepaliYear) || period.year;
    const nepaliMonth = parseInt(req.query.nepaliMonth) || period.month;
    const user = await User.findById(req.params.userId)
      .select("fullName email role biometricId joinedDate")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    const { summary, records } =
      await attendanceService.getMonthlyAttendanceSummary(
        req.params.userId,
        nepaliYear,
        nepaliMonth,
      );
    res.json({
      user,
      nepaliYear,
      nepaliMonth,
      summary,
      records: records.map((r) => fmt(r.toObject ? r.toObject() : r)),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/user/:userId/history
const getUserAttendanceHistory = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("fullName email role biometricId")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    const history = await attendanceService.getUserAttendanceHistory(
      req.params.userId,
    );
    res.json({ user, history });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTodayAttendance,
  getMyAttendance,
  getMyMonthlySummary,
  getMyAttendanceHistory,
  getCurrentPeriod,
  getAllUsersAttendance,
  getUserAttendance,
  getUserMonthlySummary,
  getUserAttendanceHistory,
};