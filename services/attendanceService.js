// const Attendance = require("../models/Attendance");
// const Holiday = require("../models/Holiday");
// const Leave = require("../models/Leave");
// const {
//   toNepaliDate,
//   getNepaliYear,
//   currentNepaliPeriod,
//   getADRangeForNepaliMonth,
//   getADRangeForNepaliYear,
// } = require("../utils/nepaliDate");
// const {
//   isLateCheckIn,
//   isEarlyCheckOut,
//   calculateWorkingMinutes,
//   determineAttendanceStatus,
//   isSaturday,
// } = require("../utils/attendanceHelper");

// /** Manual check-in */
// const checkIn = async (userId) => {
//   const now = new Date();
//   const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

//   let attendance = await Attendance.findOne({ u: userId, d: today });

//   // If already checked in, don't allow duplicate
//   if (attendance && attendance.ci) {
//     throw new Error("Already checked in for today");
//   }

//   const nepaliDate = toNepaliDate(today);
//   const late = isLateCheckIn(now);

//   if (!attendance) {
//     attendance = await Attendance.create({
//       u: userId,
//       d: today,
//       nd: nepaliDate,
//       ci: now,
//       co: null,
//       lt: late,
//       st: "P",
//       src: "m",
//       wm: 0,
//       el: false,
//     });
//   } else {
//     attendance.ci = now;
//     attendance.lt = late;
//     attendance.st = "P";
//     attendance.src = "m";
//     await attendance.save();
//   }
//   return attendance;
// };

// /** Manual check-out */
// const checkOut = async (userId) => {
//   const now = new Date();
//   const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

//   const attendance = await Attendance.findOne({ u: userId, d: today });
//   if (!attendance || !attendance.ci) {
//     throw new Error("No check-in found for today");
//   }
//   if (attendance.co) {
//     throw new Error("Already checked out for today");
//   }

//   if (now <= attendance.ci) {
//     throw new Error("Check-out time must be after check-in time");
//   }

//   attendance.co = now;
//   attendance.el = isEarlyCheckOut(now);
//   attendance.wm = calculateWorkingMinutes(attendance.ci, now);
//   await attendance.save();
//   return attendance;
// };

// /**
//  * Upsert attendance from ZKTeco biometric device.
//  * FIRST PUNCH = Check-in (kept)
//  * SECOND PUNCH = Check-out (updates record)
//  * EXTRA PUNCHES = Ignored
//  */
// const upsertBiometricAttendance = async ({ userId, punchTime }) => {
//   const time = new Date(punchTime);

//   const dayStart = new Date(time);
//   dayStart.setHours(0, 0, 0, 0);

//   let record = await Attendance.findOne({
//     u: userId,
//     d: dayStart,
//   });

//   const nepaliDate = toNepaliDate(dayStart);

//   const holiday = await Holiday.findOne({ d: dayStart });
//   const onLeave = await Leave.findOne({
//     u: userId,
//     status: "approved",
//     fromDate: { $lte: dayStart },
//     toDate: { $gte: dayStart },
//   });

//   // CASE 1: FIRST PUNCH → CREATE CHECK-IN
//   if (!record) {
//     const status = determineAttendanceStatus({
//       checkIn: time,
//       checkOut: null,
//       isHoliday: !!holiday,
//       isWeekend: isSaturday(dayStart),
//       isOnLeave: !!onLeave,
//     });

//     return await Attendance.create({
//       u: userId,
//       d: dayStart,
//       nd: nepaliDate,
//       ci: time,
//       co: null,
//       lt: isLateCheckIn(time),
//       el: false,
//       wm: 0,
//       st: status,
//       src: "b",
//     });
//   }

//   // CASE 2: ALREADY CHECKED IN, NO CHECK-OUT → UPDATE CHECK-OUT
//   if (record && !record.co) {
//     // Only update if this punch is LATER than check-in
//     if (time > record.ci) {
//       record.co = time;
//       record.el = isEarlyCheckOut(time);
//       record.wm = calculateWorkingMinutes(record.ci, time);

//       // Recalculate status with both times
//       record.st = determineAttendanceStatus({
//         checkIn: record.ci,
//         checkOut: time,
//         isHoliday: !!holiday,
//         isWeekend: isSaturday(dayStart),
//         isOnLeave: !!onLeave,
//       });

//       await record.save();
//       return record;
//     }

//     // If punch is earlier than check-in, ignore it
//     console.log(`[ZK] Ignored earlier punch for user ${userId}`);
//     return record;
//   }

//   // CASE 3: ALREADY HAS BOTH → IGNORE ALL EXTRA PUNCHES
//   console.log(
//     `[ZK] Ignored extra punch - already has both check-in and check-out`,
//   );
//   return record;
// };

// /** Today's attendance for logged-in user */
// const getTodayAttendance = async (userId) => {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   return await Attendance.findOne({ u: userId, d: today });
// };

// /** Attendance records in an AD date range */
// const getUserAttendanceRange = async (userId, startDate, endDate) => {
//   return await Attendance.find({
//     u: userId,
//     d: { $gte: new Date(startDate), $lte: new Date(endDate) },
//   }).sort({ d: 1 });
// };

// /** All users' attendance for a specific date (admin) */
// const getAllUsersAttendanceByDate = async (date) => {
//   const dayStart = new Date(date);
//   dayStart.setHours(0, 0, 0, 0);
//   return await Attendance.find({ d: dayStart }).populate(
//     "u",
//     "fullName email role",
//   );
// };

// /**
//  * Monthly summary for a Nepali year + month.
//  */
// const getMonthlyAttendanceSummary = async (userId, nepaliYear, nepaliMonth) => {
//   const period = currentNepaliPeriod();
//   const year = nepaliYear || period.year;
//   const month = nepaliMonth || period.month;

//   const { startAD, endAD } = getADRangeForNepaliMonth(year, month);
//   const records = await Attendance.find({
//     u: userId,
//     d: { $gte: startAD, $lte: endAD },
//   }).sort({ d: 1 });

//   return { summary: buildSummary(records), records, period: { year, month } };
// };

// /**
//  * Yearly summary for a Nepali year.
//  */
// const getYearlyAttendanceSummary = async (userId, nepaliYear) => {
//   const year = nepaliYear || currentNepaliPeriod().year;
//   const { startAD, endAD } = getADRangeForNepaliYear(year);
//   const records = await Attendance.find({
//     u: userId,
//     d: { $gte: startAD, $lte: endAD },
//   }).sort({ d: 1 });

//   return { summary: buildSummary(records), records, period: { year } };
// };

// /**
//  * Full attendance history for a user — all years they have records.
//  */
// const getUserAttendanceHistory = async (userId) => {
//   const allRecords = await Attendance.find({ u: userId }).sort({ d: -1 });

//   // Group by Nepali year
//   const byYear = {};
//   allRecords.forEach((r) => {
//     const year = getNepaliYear(r.d);
//     if (!byYear[year]) byYear[year] = [];
//     byYear[year].push(r);
//   });

//   return Object.entries(byYear)
//     .sort(([a], [b]) => b - a)
//     .map(([year, records]) => ({
//       nepaliYear: Number(year),
//       summary: buildSummary(records),
//     }));
// };

// /** Build attendance summary counts from a records array */
// const buildSummary = (records) => {
//   const summary = {
//     totalDays: 0,
//     presentDays: 0,
//     absentDays: 0,
//     lateDays: 0,
//     earlyLeaveDays: 0,
//     leaveDays: 0,
//     holidayDays: 0,
//     weekendDays: 0,
//     halfDays: 0,
//   };
//   records.forEach((r) => {
//     if (r.st === "W") {
//       summary.weekendDays++;
//       return;
//     }
//     if (r.st === "X") {
//       summary.holidayDays++;
//       return;
//     }
//     summary.totalDays++;
//     if (r.st === "P") summary.presentDays++;
//     if (r.st === "A") summary.absentDays++;
//     if (r.st === "H") summary.halfDays++;
//     if (r.st === "L") summary.leaveDays++;
//     if (r.lt) summary.lateDays++;
//     if (r.el) summary.earlyLeaveDays++;
//   });
//   return summary;
// };

// module.exports = {
//   checkIn,
//   checkOut,
//   upsertBiometricAttendance,
//   getTodayAttendance,
//   getUserAttendanceRange,
//   getAllUsersAttendanceByDate,
//   getMonthlyAttendanceSummary,
//   getYearlyAttendanceSummary,
//   getUserAttendanceHistory,
//   buildSummary,
// };
const Attendance = require("../models/Attendance");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");
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

/** Manual check-in */
const checkIn = async (userId) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let attendance = await Attendance.findOne({ u: userId, d: today });

  if (attendance && attendance.ci) {
    throw new Error("Already checked in for today");
  }

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
      ot: 0, // new field
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

/** Manual check-out (with overtime handling for off-days) */
const checkOut = async (userId) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const attendance = await Attendance.findOne({ u: userId, d: today });
  if (!attendance || !attendance.ci) {
    throw new Error("No check-in found for today");
  }
  if (attendance.co) {
    throw new Error("Already checked out for today");
  }

  if (now <= attendance.ci) {
    throw new Error("Check-out time must be after check-in time");
  }

  attendance.co = now;
  attendance.el = isEarlyCheckOut(now);

  const totalMinutes = Math.floor((now - attendance.ci) / 60000);
  const isOffDay = attendance.st === "W" || attendance.st === "X";

  if (isOffDay) {
    attendance.wm = 0;
    attendance.ot = totalMinutes;
  } else {
    attendance.wm = calculateWorkingMinutes(attendance.ci, now);
    attendance.ot = 0;
  }

  await attendance.save();
  return attendance;
};

/**
 * Upsert attendance from biometric device (normal punch).
 * Uses atomic updateOne with upsert to avoid duplicates.
 */
const upsertBiometricAttendance = async ({ userId, punchTime }) => {
  const time = new Date(punchTime);
  const dayStart = new Date(time);
  dayStart.setHours(0, 0, 0, 0);

  const nepaliDate = toNepaliDate(dayStart);
  const holiday = await Holiday.findOne({ date: dayStart });
  const onLeave = await Leave.findOne({
    u: userId,
    status: "approved",
    fromDate: { $lte: dayStart },
    toDate: { $gte: dayStart },
  });

  const isOffDay = !!holiday || isSaturday(dayStart);
  const status = holiday ? "X" : isSaturday(dayStart) ? "W" : "P";

  // Try to find existing record for this user/day
  const existing = await Attendance.findOne({ u: userId, d: dayStart });

  if (!existing) {
    // First punch of the day – create new record
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

  // Record exists – decide what to update
  if (existing.ci && !existing.co) {
    // We have check-in, no check-out -> this is a check-out
    const update = {
      co: time,
      el: isEarlyCheckOut(time),
    };

    const totalMins = Math.floor((time - existing.ci) / 60000);
    if (isOffDay) {
      update.wm = 0;
      update.ot = totalMins;
      update.st = status; // ensure holiday/weekend status
    } else {
      update.wm = calculateWorkingMinutes(existing.ci, time);
      update.ot = 0;
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

  // Already has both ci & co – ignore (or could update with later checkout if needed)
  console.log(`[ZK] Ignored extra punch for user ${userId} on ${dayStart}`);
  return existing;
};

/** Today's attendance for logged-in user */
const getTodayAttendance = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
 * Monthly summary for a Nepali year + month.
 */
const getMonthlyAttendanceSummary = async (userId, nepaliYear, nepaliMonth) => {
  const period = currentNepaliPeriod();
  const year = nepaliYear || period.year;
  const month = nepaliMonth || period.month;

  const { startAD, endAD } = getADRangeForNepaliMonth(year, month);
  const records = await Attendance.find({
    u: userId,
    d: { $gte: startAD, $lte: endAD },
  }).sort({ d: 1 });

  return { summary: buildSummary(records), records, period: { year, month } };
};

/**
 * Yearly summary for a Nepali year.
 */
const getYearlyAttendanceSummary = async (userId, nepaliYear) => {
  const year = nepaliYear || currentNepaliPeriod().year;
  const { startAD, endAD } = getADRangeForNepaliYear(year);
  const records = await Attendance.find({
    u: userId,
    d: { $gte: startAD, $lte: endAD },
  }).sort({ d: 1 });

  return { summary: buildSummary(records), records, period: { year } };
};

/**
 * Full attendance history for a user — all years they have records.
 */
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

/** Build attendance summary counts from a records array */
const buildSummary = (records) => {
  const summary = {
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    earlyLeaveDays: 0,
    leaveDays: 0,
    holidayDays: 0,
    weekendDays: 0,
    halfDays: 0,
    overtimeDays: 0, // optional: count days with overtime
  };
  records.forEach((r) => {
    if (r.st === "W") {
      summary.weekendDays++;
      if (r.ot > 0) summary.overtimeDays++;
      return;
    }
    if (r.st === "X") {
      summary.holidayDays++;
      if (r.ot > 0) summary.overtimeDays++;
      return;
    }
    summary.totalDays++;
    if (r.st === "P") summary.presentDays++;
    if (r.st === "A") summary.absentDays++;
    if (r.st === "H") summary.halfDays++;
    if (r.st === "L") summary.leaveDays++;
    if (r.lt) summary.lateDays++;
    if (r.el) summary.earlyLeaveDays++;
    if (r.ot > 0) summary.overtimeDays++;
  });
  return summary;
};
/**
 * Upsert an overtime-specific attendance record.
 * Called for punch state 4 (overtime-in) and 5 (overtime-out).
 *
 * Behavior:
 * - Overtime-in uses updateOne with upsert:true, so a fresh day creates the record
 *   and stores the overtime check-in time.
 * - Overtime-out updates the same day record and calculates total overtime minutes
 *   from check-in to check-out.
 */
const upsertOvertimeAttendance = async ({ userId, punchTime, isIn }) => {
  const time = new Date(punchTime);
  const dayStart = new Date(time);
  dayStart.setHours(0, 0, 0, 0);

  const nepaliDate = toNepaliDate(dayStart);
  const holiday = await Holiday.findOne({ date: dayStart });
  const offDay = !!holiday || isSaturday(dayStart);
  const status = holiday ? "X" : isSaturday(dayStart) ? "W" : "P";

  if (isIn) {
    // Overtime IN – set check-in, clear any old check-out, reset fields
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
        $unset: { co: "" }, // remove check-out if exists
      },
      { upsert: true },
    );
  } else {
    // Overtime OUT – find record and set check-out, compute overtime
    const existing = await Attendance.findOne({ u: userId, d: dayStart });
    if (existing && existing.ci && !existing.co && time > existing.ci) {
      const totalMins = Math.floor((time - existing.ci) / 60000);
      await Attendance.updateOne(
        { _id: existing._id },
        {
          $set: {
            co: time,
            ot: totalMins,
            wm: 0,
            el: false,
            st: status,
          },
        },
      );
      return Attendance.findById(existing._id);
    } else if (!existing) {
      // No record yet – create one with only check-out (edge case)
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
    // If already has checkout, ignore
    return existing;
  }
};

// Also update module.exports to include upsertOvertimeAttendance

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
