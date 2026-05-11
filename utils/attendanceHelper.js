// const OFFICE_RULES = require("../constants/officeRules");

// // Nepal is UTC+5:45 = 345 minutes ahead of UTC
// const NPT_OFFSET_MINUTES = 345;

// /**
//  * Convert a UTC Date to Nepal Time equivalent Date object
//  * e.g. 2026-05-06T07:00:43Z → treated as 12:45:43 NPT
//  */
// const toNPT = (utcDate) => {
//   if (!utcDate) return null;
//   const d = new Date(utcDate);
//   // Shift the date by NPT offset so getHours()/getMinutes() return NPT values
//   return new Date(d.getTime() + NPT_OFFSET_MINUTES * 60 * 1000);
// };

// /**
//  * Get hour and minute in Nepal Time from a UTC Date
//  */
// const getNPTHourMinute = (utcDate) => {
//   const npt = toNPT(utcDate);
//   return { hour: npt.getUTCHours(), minute: npt.getUTCMinutes() };
// };

// /**
//  * Is check-in late? (after 7:00 AM NPT)
//  */
// const isLateCheckIn = (checkInTime) => {
//   const { hour, minute } = getNPTHourMinute(checkInTime);
//   const totalMinutes = hour * 60 + minute;
//   const officeStartMinutes =
//     OFFICE_RULES.OFFICE_START_HOUR * 60 + OFFICE_RULES.OFFICE_START_MINUTE;
//   return totalMinutes > officeStartMinutes;
// };

// /**
//  * Is check-out early? (before 2:00 PM NPT)
//  */
// const isEarlyCheckOut = (checkOutTime) => {
//   const { hour, minute } = getNPTHourMinute(checkOutTime);
//   const totalMinutes = hour * 60 + minute;
//   const officeEndMinutes =
//     OFFICE_RULES.OFFICE_END_HOUR * 60 + OFFICE_RULES.OFFICE_END_MINUTE;
//   return totalMinutes < officeEndMinutes;
// };

// /**
//  * Calculate effective working minutes (excluding 1 hour lunch break)
//  */
// const calculateWorkingMinutes = (checkIn, checkOut) => {
//   if (!checkIn || !checkOut) return 0;
//   const totalMinutes = Math.floor(
//     (new Date(checkOut) - new Date(checkIn)) / 60000,
//   );
//   if (totalMinutes <= 0) return 0;
//   // Only subtract lunch break if total time is more than lunch break duration
//   // e.g. if someone only worked 33 minutes, don't subtract 60 min lunch
//   const effectiveMinutes =
//     totalMinutes > OFFICE_RULES.LUNCH_BREAK_MINUTES
//       ? totalMinutes - OFFICE_RULES.LUNCH_BREAK_MINUTES
//       : totalMinutes;
//   return Math.max(0, effectiveMinutes);
// };

// /**
//  * Determine attendance status
//  */
// const determineAttendanceStatus = ({
//   checkIn,
//   checkOut,
//   isHoliday,
//   isWeekend,
//   isOnLeave,
// }) => {
//   if (isWeekend) return "weekend";
//   if (isHoliday) return "holiday";
//   if (isOnLeave) return "on-leave";
//   if (!checkIn) return "absent";

//   const workingMinutes = calculateWorkingMinutes(checkIn, checkOut);
//   const halfDayThreshold = (OFFICE_RULES.EFFECTIVE_WORK_HOURS * 60) / 2; // 180 min

//   if (workingMinutes >= halfDayThreshold) return "present";
//   if (workingMinutes > 0) return "half-day";
//   return "absent";
// };

// /**
//  * Is the given date a Saturday (weekly off)?
//  * Uses NPT date to avoid UTC midnight boundary issues
//  */
// const isSaturday = (date) => {
//   // Use NPT shifted date so day-of-week is correct for Nepal
//   const npt = new Date(
//     new Date(date).getTime() + NPT_OFFSET_MINUTES * 60 * 1000,
//   );
//   return npt.getUTCDay() === OFFICE_RULES.WEEKLY_OFF_DAY;
// };

// /**
//  * Count working days between two dates
//  * Excludes Saturdays and given holiday dates
//  */
// const countWorkingDays = (startDate, endDate, holidayDates = []) => {
//   let count = 0;
//   const current = new Date(startDate);
//   const end = new Date(endDate);

//   const holidayStrings = holidayDates.map((h) => {
//     const d = new Date(h);
//     return d.toISOString().slice(0, 10);
//   });

//   while (current <= end) {
//     const dateStr = current.toISOString().slice(0, 10);
//     if (!isSaturday(current) && !holidayStrings.includes(dateStr)) {
//       count++;
//     }
//     current.setDate(current.getDate() + 1);
//   }

//   return count;
// };

// module.exports = {
//   toNPT,
//   getNPTHourMinute,
//   isLateCheckIn,
//   isEarlyCheckOut,
//   calculateWorkingMinutes,
//   determineAttendanceStatus,
//   isSaturday,
//   countWorkingDays,
// };
const OFFICE_RULES = require("../constants/officeRules");

// Nepal is UTC+5:45 = 345 minutes ahead of UTC
const NPT_OFFSET_MINUTES = 345;

/**
 * Convert a UTC Date to Nepal Time equivalent Date object
 */
const toNPT = (utcDate) => {
  if (!utcDate) return null;
  const d = new Date(utcDate);
  return new Date(d.getTime() + NPT_OFFSET_MINUTES * 60 * 1000);
};

/**
 * Get hour and minute in Nepal Time from a UTC Date
 */
const getNPTHourMinute = (utcDate) => {
  const npt = toNPT(utcDate);
  return { hour: npt.getUTCHours(), minute: npt.getUTCMinutes() };
};

/**
 * Is check-in late? (after 7:00 AM NPT)
 */
const isLateCheckIn = (checkInTime) => {
  const { hour, minute } = getNPTHourMinute(checkInTime);
  const totalMinutes = hour * 60 + minute;
  const officeStartMinutes =
    OFFICE_RULES.OFFICE_START_HOUR * 60 + OFFICE_RULES.OFFICE_START_MINUTE;
  return totalMinutes > officeStartMinutes;
};

/**
 * Is check-out early? (before 2:00 PM NPT)
 */
const isEarlyCheckOut = (checkOutTime) => {
  const { hour, minute } = getNPTHourMinute(checkOutTime);
  const totalMinutes = hour * 60 + minute;
  const officeEndMinutes =
    OFFICE_RULES.OFFICE_END_HOUR * 60 + OFFICE_RULES.OFFICE_END_MINUTE;
  return totalMinutes < officeEndMinutes;
};

/**
 * Calculate effective working minutes (excluding 1 hour lunch break)
 */
const calculateWorkingMinutes = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const totalMinutes = Math.floor(
    (new Date(checkOut) - new Date(checkIn)) / 60000,
  );
  if (totalMinutes <= 0) return 0;
  const effectiveMinutes =
    totalMinutes > OFFICE_RULES.LUNCH_BREAK_MINUTES
      ? totalMinutes - OFFICE_RULES.LUNCH_BREAK_MINUTES
      : totalMinutes;
  return Math.max(0, effectiveMinutes);
};

/**
 * Determine attendance status
 */
const determineAttendanceStatus = ({
  checkIn,
  checkOut,
  isHoliday,
  isWeekend,
  isOnLeave,
}) => {
  if (isWeekend) return "weekend";
  if (isHoliday) return "holiday";
  if (isOnLeave) return "on-leave";
  if (!checkIn) return "absent";

  const workingMinutes = calculateWorkingMinutes(checkIn, checkOut);
  const halfDayThreshold = (OFFICE_RULES.EFFECTIVE_WORK_HOURS * 60) / 2;

  if (workingMinutes >= halfDayThreshold) return "present";
  if (workingMinutes > 0) return "half-day";
  return "absent";
};

/**
 * Is the given date a Saturday (weekly off)?
 * For date-only checks (no time), use simple getDay()
 * For datetime checks, use NPT shift
 */
const isSaturday = (date) => {
  const d = new Date(date);
  // Simple day check - works for date-only comparisons
  return d.getDay() === OFFICE_RULES.WEEKLY_OFF_DAY;
};

/**
 * Count working days between two dates
 * Excludes Saturdays and given holiday dates
 */
const countWorkingDays = (startDate, endDate, holidayDates = []) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  // Convert holiday dates to timestamps for reliable comparison
  const holidayTimestamps = holidayDates.map((h) => {
    const d = new Date(h);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const currentTime = current.getTime();
    const dayOfWeek = current.getDay();
    const isSat = dayOfWeek === 6; // Saturday
    const isHoliday = holidayTimestamps.includes(currentTime);

    if (!isSat && !isHoliday) {
      count++;
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  return count;
};

module.exports = {
  toNPT,
  getNPTHourMinute,
  isLateCheckIn,
  isEarlyCheckOut,
  calculateWorkingMinutes,
  determineAttendanceStatus,
  isSaturday,
  countWorkingDays,
};
