const Attendance = require("../models/Attendance");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");
const User = require("../models/User");
const {
  toNepaliDate,
  getNepaliYear,
  currentNepaliPeriod,
  getADRangeForNepaliMonth,
  getADRangeForNepaliYear,
} = require("../utils/nepaliDate");
const {
  isLateCheckIn,
  isEarlyCheckOut,
  calculateWorkingMinutes,
  determineAttendanceStatus,
  isSaturday,
} = require("../utils/attendanceHelper");
const OFFICE_RULES = require("../constants/officeRules");

const NPT_OFFSET_MS = 345 * 60 * 1000; // UTC+5:45

/**
 * Calculate overtime minutes for a regular working day.
 * Overtime = minutes before OFFICE_START + minutes after OFFICE_END
 */
const calculateRegularDayOvertime = (checkIn, checkOut) => {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);

  const startMins =
    OFFICE_RULES.OFFICE_START_HOUR * 60 + OFFICE_RULES.OFFICE_START_MINUTE;
  const endMins =
    OFFICE_RULES.OFFICE_END_HOUR * 60 + OFFICE_RULES.OFFICE_END_MINUTE;

  const ciNPT = new Date(ci.getTime() + NPT_OFFSET_MS);
  const coNPT = new Date(co.getTime() + NPT_OFFSET_MS);

  const ciTotalMins = ciNPT.getHours() * 60 + ciNPT.getMinutes();
  const coTotalMins = coNPT.getHours() * 60 + coNPT.getMinutes();

  let overtime = 0;
  if (ciTotalMins < startMins) {
    overtime += startMins - ciTotalMins;
  }
  if (coTotalMins > endMins) {
    overtime += coTotalMins - endMins;
  }
  return overtime;
};

// Get today's date in NPT as UTC midnight
const getTodayNPT = () => {
  const nowNPT = new Date(Date.now() + NPT_OFFSET_MS);
  return new Date(nowNPT.toISOString().slice(0, 10) + "T00:00:00.000Z");
};

/** Manual check-in */
const checkIn = async (userId) => {
  const now = new Date();
  const today = getTodayNPT();

  let attendance = await Attendance.findOne({ u: userId, d: today });
  if (attendance && attendance.ci)
    throw new Error("Already checked in for today");

  const nepaliDate = toNepaliDate(today);
  const late = isLateCheckIn(now);

  if (!attendance) {
    attendance = await Attendance.create({
      u: userId,
      d: today,
      nd: nepaliDate,
      ci: now,
      co: null,
      lt: late,
      st: "P",
      src: "m",
      wm: 0,
      ot: 0,
      el: false,
    });
  } else {
    attendance.ci = now;
    attendance.lt = late;
    attendance.st = "P";
    attendance.src = "m";
    await attendance.save();
  }
  return attendance;
};

/** Manual check-out */
const checkOut = async (userId) => {
  const now = new Date();
  const today = getTodayNPT();

  const attendance = await Attendance.findOne({ u: userId, d: today });
  if (!attendance || !attendance.ci)
    throw new Error("No check-in found for today");
  if (attendance.co) throw new Error("Already checked out for today");
  if (now <= attendance.ci)
    throw new Error("Check-out time must be after check-in time");

  attendance.co = now;
  attendance.el = isEarlyCheckOut(now);

  const totalMinutes = Math.floor((now - attendance.ci) / 60000);
  const isOffDay = attendance.st === "W" || attendance.st === "X";
  if (isOffDay) {
    attendance.wm = 0;
    attendance.ot = totalMinutes;
  } else {
    attendance.wm = calculateWorkingMinutes(attendance.ci, now);
    attendance.ot = calculateRegularDayOvertime(attendance.ci, now);
  }

  await attendance.save();
  return attendance;
};

/** Upsert from biometric device */
const upsertBiometricAttendance = async ({ userId, punchTime }) => {
  const time = new Date(punchTime);
  const dayStart = new Date(time);
  dayStart.setHours(0, 0, 0, 0);

  const nepaliDate = toNepaliDate(dayStart);
  const holiday = await Holiday.findOne({ date: dayStart });
  const onLeave = await Leave.findOne({
    user: userId,
    status: "approved",
    fromDate: { $lte: dayStart },
    toDate: { $gte: dayStart },
  });

  const isOffDay = !!holiday || isSaturday(dayStart);
  const status = holiday ? "X" : isSaturday(dayStart) ? "W" : "P";

  const existing = await Attendance.findOne({ u: userId, d: dayStart });
  if (!existing) {
    return await Attendance.create({
      u: userId,
      d: dayStart,
      nd: nepaliDate,
      ci: time,
      co: null,
      lt: isOffDay ? false : isLateCheckIn(time),
      el: false,
      wm: 0,
      ot: 0,
      st: status,
      src: "b",
    });
  }

  if (existing.ci && !existing.co) {
    const update = { co: time, el: isEarlyCheckOut(time) };
    const totalMins = Math.floor((time - existing.ci) / 60000);
    if (isOffDay) {
      update.wm = 0;
      update.ot = totalMins;
      update.st = status;
    } else {
      update.wm = calculateWorkingMinutes(existing.ci, time);
      update.ot = calculateRegularDayOvertime(existing.ci, time);
      update.st = determineAttendanceStatus({
        checkIn: existing.ci,
        checkOut: time,
        isHoliday: !!holiday,
        isWeekend: isSaturday(dayStart),
        isOnLeave: !!onLeave,
      });
    }
    await Attendance.updateOne({ _id: existing._id }, { $set: update });
    return Attendance.findById(existing._id);
  }

  return existing;
};

/** Today's attendance */
const getTodayAttendance = async (userId) => {
  const today = getTodayNPT();
  return await Attendance.findOne({ u: userId, d: today });
};

/** Attendance records in an AD date range */
const getUserAttendanceRange = async (userId, startDate, endDate) => {
  return await Attendance.find({
    u: userId,
    d: { $gte: new Date(startDate), $lte: new Date(endDate) },
  }).sort({ d: 1 });
};

/** All users' attendance for a specific date (admin) */
const getAllUsersAttendanceByDate = async (date) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  return await Attendance.find({ d: dayStart }).populate(
    "u",
    "fullName email role",
  );
};

/**
 * Monthly summary — fills in absent days for working days with no punch.
 * Only counts days from the user's joinedDate onwards.
 * Excludes Saturdays and admin holidays from absent count.
 */
const getMonthlyAttendanceSummary = async (userId, nepaliYear, nepaliMonth) => {
  const period = currentNepaliPeriod();
  const year = nepaliYear || period.year;
  const month = nepaliMonth || period.month;

  const { startAD, endAD } = getADRangeForNepaliMonth(year, month);

  // Get user's joined date — don't show records before this
  const userDoc = await User.findById(userId).select("createdAt").lean();
  const joinedDate = userDoc?.createdAt ? new Date(userDoc.createdAt) : null;

  // Clamp range start to joinedDate if needed
  const rangeStart = joinedDate && joinedDate > startAD ? joinedDate : startAD;
  // Clamp range end to today (don't show future days)
  const today = getTodayNPT();
  const rangeEnd = endAD > today ? today : endAD;

  // Get holidays in range
  const holidays = await Holiday.find({
    date: { $gte: rangeStart, $lte: rangeEnd },
  }).lean();
  const holidaySet = new Set(
    holidays.map((h) => h.date.toISOString().slice(0, 10)),
  );

  // Get approved leaves in range
  const leaves = await Leave.find({
    user: userId,
    status: "approved",
    fromDate: { $lte: rangeEnd },
    toDate: { $gte: rangeStart },
  }).lean();

  // Build a set of leave dates
  const leaveSet = new Set();
  leaves.forEach((l) => {
    const cur = new Date(l.fromDate);
    const end = new Date(l.toDate);
    while (cur <= end) {
      leaveSet.add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  });

  // Get existing attendance records
  const existingRecords = await Attendance.find({
    u: userId,
    d: { $gte: rangeStart, $lte: rangeEnd },
  })
    .sort({ d: 1 })
    .lean();

  // Build a map of existing records by date string
  const recordMap = {};
  existingRecords.forEach((r) => {
    // Normalize: create a UTC midnight date, then get ISO string
    const d = new Date(r.d);
    d.setHours(0, 0, 0, 0);
    recordMap[d.toISOString().slice(0, 10)] = r;
  });

  // Walk every day in range and fill gaps with absent/weekend/holiday/leave
  const allRecords = [];
  const cur = new Date(rangeStart);
  cur.setHours(0, 0, 0, 0);

  while (cur <= rangeEnd) {
    const dateStr = cur.toISOString().slice(0, 10);
    const existing = recordMap[dateStr];

    if (existing) {
      allRecords.push(existing);
    } else {
      // Determine what this day should be
      const isSat = isSaturday(cur);
      const isHol = holidaySet.has(dateStr);
      const isLeave = leaveSet.has(dateStr);

      let st = "A"; // absent by default
      if (isSat) st = "W";
      else if (isHol) st = "X";
      else if (isLeave) st = "L";

      // Create a synthetic (not saved to DB) absent/weekend/holiday record
      allRecords.push({
        _id: null,
        u: userId,
        d: new Date(cur),
        nd: toNepaliDate(cur),
        ci: null,
        co: null,
        wm: 0,
        ot: 0,
        st,
        lt: false,
        el: false,
        src: "s",
        _synthetic: true, // mark as not from DB
      });
    }

    cur.setDate(cur.getDate() + 1);
  }

  // DEBUG
  const may17 = allRecords.find((r) => {
    const d = new Date(r.d).toISOString().slice(0, 10);
    return d === "2026-05-17";
  });
  console.log(
    "MAY 17 RECORD:",
    JSON.stringify({
      found: !!may17,
      st: may17?.st,
      ci: may17?.ci,
      co: may17?.co,
      synthetic: may17?._synthetic,
      id: may17?._id,
    }),
  );

  return {
    summary: buildSummary(allRecords),
    records: allRecords,
    period: { year, month },
  };
};

/** Yearly summary */
const getYearlyAttendanceSummary = async (userId, nepaliYear) => {
  const year = nepaliYear || currentNepaliPeriod().year;
  const { startAD, endAD } = getADRangeForNepaliYear(year);
  const records = await Attendance.find({
    u: userId,
    d: { $gte: startAD, $lte: endAD },
  }).sort({ d: 1 });
  return { summary: buildSummary(records), records, period: { year } };
};

/** Full attendance history grouped by BS year */
const getUserAttendanceHistory = async (userId) => {
  const allRecords = await Attendance.find({ u: userId }).sort({ d: -1 });
  const byYear = {};
  allRecords.forEach((r) => {
    const year = getNepaliYear(r.d);
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(r);
  });
  return Object.entries(byYear)
    .sort(([a], [b]) => b - a)
    .map(([year, records]) => ({
      nepaliYear: Number(year),
      summary: buildSummary(records),
    }));
};

/** Build summary counts */
const buildSummary = (records) => {
  const s = {
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    earlyLeaveDays: 0,
    leaveDays: 0,
    holidayDays: 0,
    weekendDays: 0,
    halfDays: 0,
    overtimeDays: 0,
  };
  records.forEach((r) => {
    if (r.st === "W") {
      s.weekendDays++;
      if (r.ot > 0) s.overtimeDays++;
      return;
    }
    if (r.st === "X") {
      s.holidayDays++;
      if (r.ot > 0) s.overtimeDays++;
      return;
    }
    s.totalDays++;
    if (r.st === "P") s.presentDays++;
    if (r.st === "A") s.absentDays++;
    if (r.st === "H") s.halfDays++;
    if (r.st === "L") s.leaveDays++;
    if (r.lt) s.lateDays++;
    if (r.el) s.earlyLeaveDays++;
    if (r.ot > 0) s.overtimeDays++;
  });
  return s;
};

/** Upsert overtime attendance */
const upsertOvertimeAttendance = async ({ userId, punchTime, isIn }) => {
  const time = new Date(punchTime);
  const dayStart = new Date(time);
  dayStart.setHours(0, 0, 0, 0);

  const nepaliDate = toNepaliDate(dayStart);
  const holiday = await Holiday.findOne({ date: dayStart });
  const status = holiday ? "X" : isSaturday(dayStart) ? "W" : "P";

  if (isIn) {
    return await Attendance.updateOne(
      { u: userId, d: dayStart },
      {
        $set: {
          ci: time,
          nd: nepaliDate,
          st: status,
          lt: false,
          el: false,
          wm: 0,
          ot: 0,
          src: "b",
        },
        $unset: { co: "" },
      },
      { upsert: true },
    );
  } else {
    const existing = await Attendance.findOne({ u: userId, d: dayStart });
    if (existing && existing.ci && !existing.co && time > existing.ci) {
      const totalMins = Math.floor((time - existing.ci) / 60000);
      await Attendance.updateOne(
        { _id: existing._id },
        { $set: { co: time, ot: totalMins, wm: 0, el: false, st: status } },
      );
      return Attendance.findById(existing._id);
    } else if (!existing) {
      return await Attendance.create({
        u: userId,
        d: dayStart,
        nd: nepaliDate,
        ci: null,
        co: time,
        lt: false,
        el: false,
        wm: 0,
        ot: 0,
        st: status,
        src: "b",
      });
    }
    return existing;
  }
};

module.exports = {
  checkIn,
  checkOut,
  upsertBiometricAttendance,
  upsertOvertimeAttendance,
  getTodayAttendance,
  getUserAttendanceRange,
  getAllUsersAttendanceByDate,
  getMonthlyAttendanceSummary,
  getYearlyAttendanceSummary,
  getUserAttendanceHistory,
  buildSummary,
};