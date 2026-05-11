// const Zkteco = require("zkteco-js");
// const User = require("../models/User");
// const Attendance = require("../models/Attendance");
// const Holiday = require("../models/Holiday");
// const Leave = require("../models/Leave");
// const { toNepaliDate } = require("../utils/nepaliDate");
// const {
//   isLateCheckIn,
//   isEarlyCheckOut,
//   calculateWorkingMinutes,
//   isSaturday,
// } = require("../utils/attendanceHelper");

// const ZK_IP = process.env.ZK_DEVICE_IP || "192.168.1.201";
// const ZK_PORT = parseInt(process.env.ZK_DEVICE_PORT) || 4370;

// // ─── Device connect/disconnect ───────────────────────────────────────────────

// const getDevice = async () => {
//   const dev = new Zkteco(ZK_IP, ZK_PORT, 5200, 5000);
//   await dev.createSocket();
//   return dev;
// };

// const safeDisconnect = async (dev) => {
//   try {
//     if (dev) await dev.disconnect();
//   } catch (_) {}
// };

// // ─── Parse punch time from device log ────────────────────────────────────────

// /**
//  * The device sends record_time as a date string like:
//  * "Fri May 01 2026 08:33:47 GMT+0545 (Nepal Time)"
//  * new Date() handles this fine in Node.js.
//  */
// const parsePunchTime = (log) => {
//   const raw = log.record_time;
//   if (!raw) return null;
//   const t = new Date(raw);
//   return isNaN(t.getTime()) ? null : t;
// };

// // ─── Group logs by user+day ───────────────────────────────────────────────────

// /**
//  * Returns: { "bioId__YYYY-MM-DD": [Date, Date, ...] } sorted asc
//  * First = checkIn, Last = checkOut
//  */
// const NPT_OFFSET_MS = 345 * 60 * 1000; // Nepal = UTC+5:45

// const groupByUserDay = (logs) => {
//   const map = {};
//   for (const log of logs) {
//     const t = parsePunchTime(log);
//     if (!t) continue;
//     // Shift to NPT so punches near midnight group to the correct Nepal date
//     const nptDate = new Date(t.getTime() + NPT_OFFSET_MS);
//     const day = nptDate.toISOString().slice(0, 10); // "2026-05-01" in NPT
//     const k = `${log.user_id}__${day}`;
//     if (!map[k]) map[k] = [];
//     map[k].push(t);
//   }
//   for (const k of Object.keys(map)) map[k].sort((a, b) => a - b);
//   return map;
// };

// // ─── Resolve attendance status ────────────────────────────────────────────────

// const resolveStatus = (checkIn, isHoliday, isWeekend, isOnLeave) => {
//   if (isWeekend) return "W";
//   if (isHoliday) return "X";
//   if (isOnLeave) return "L";
//   if (checkIn) return "P";
//   return "A";
// };

// // ─── Upsert one attendance record ────────────────────────────────────────────

// const upsertRecord = async (userId, date, checkIn, checkOut) => {
//   const [holiday, onLeave] = await Promise.all([
//     Holiday.findOne({ date }).lean().select("_id"),
//     Leave.findOne({
//       user: userId,
//       status: "approved",
//       fromDate: { $lte: date },
//       toDate: { $gte: date },
//     })
//       .lean()
//       .select("_id"),
//   ]);

//   const weekend = isSaturday(date);
//   const status = resolveStatus(checkIn, !!holiday, weekend, !!onLeave);
//   const late = checkIn && !weekend && !holiday ? isLateCheckIn(checkIn) : false;
//   const earlyOut =
//     checkOut && !weekend && !holiday ? isEarlyCheckOut(checkOut) : false;
//   const workMins =
//     checkIn && checkOut ? calculateWorkingMinutes(checkIn, checkOut) : 0;

//   // Calculate overtime: working beyond 2 PM (officeEnd)
//   // workMins > 360 (6 hrs effective) = overtime
//   const STANDARD_WORK_MINS = 360;
//   const overtimeMins =
//     workMins > STANDARD_WORK_MINS ? workMins - STANDARD_WORK_MINS : 0;

//   await Attendance.findOneAndUpdate(
//     { u: userId, d: date },
//     {
//       $set: {
//         nd: toNepaliDate(date),
//         ci: checkIn || null,
//         co: checkOut || null,
//         wm: workMins,
//         ot: overtimeMins, // overtime minutes
//         st: status,
//         lt: late,
//         el: earlyOut,
//         src: "b",
//       },
//     },
//     { upsert: true, returnDocument: "after" },
//   );
// };

// // ─── 1. Batch sync ────────────────────────────────────────────────────────────

// const syncAttendanceLogs = async () => {
//   let dev;
//   try {
//     console.log(`[ZK] Connecting to ${ZK_IP}:${ZK_PORT}...`);
//     dev = await getDevice();

//     const { data: logs } = await dev.getAttendances();
//     if (!logs || logs.length === 0) {
//       console.log("[ZK] No logs on device");
//       return { synced: 0, skipped: 0 };
//     }
//     console.log(`[ZK] ${logs.length} raw punches pulled from device`);

//     const grouped = groupByUserDay(logs);
//     const allBioIds = [
//       ...new Set(Object.keys(grouped).map((k) => k.split("__")[0])),
//     ];

//     // Fetch matching active users from MongoDB
//     const users = await User.find(
//       { biometricId: { $in: allBioIds }, isActive: true },
//       { _id: 1, biometricId: 1 },
//     ).lean();
//     const bioMap = {};
//     for (const u of users) bioMap[u.biometricId] = u._id;

//     let synced = 0,
//       skipped = 0;

//     for (const [key, punches] of Object.entries(grouped)) {
//       const [bioId, dayStr] = key.split("__");
//       const userId = bioMap[bioId];
//       if (!userId) {
//         skipped++;
//         continue;
//       } // biometricId not assigned in MongoDB yet

//       const date = new Date(dayStr);
//       date.setHours(0, 0, 0, 0);

//       await upsertRecord(
//         userId,
//         date,
//         punches[0],
//         punches.length > 1 ? punches[punches.length - 1] : null,
//       );
//       synced++;
//     }

//     console.log(
//       `[ZK] Batch sync done — synced: ${synced}, skipped: ${skipped}`,
//     );
//     return { synced, skipped };
//   } catch (err) {
//     console.error("[ZK] Batch sync failed:", err.message);
//     throw err;
//   } finally {
//     await safeDisconnect(dev);
//   }
// };

// // ─── 2. Real-time listener ────────────────────────────────────────────────────

// let _rt = null;
// let _retryTimer = null;

// const startRealTimeListener = async () => {
//   if (_rt) return;
//   try {
//     console.log("[ZK] Starting real-time listener...");
//     _rt = await getDevice();

//     await _rt.getRealTimeLogs(async (log) => {
//       try {
//         // Real-time log uses record_time too
//         const punchTime = parsePunchTime(log);
//         if (!punchTime) return;

//         // Use NPT date so the record lands on the correct Nepal calendar day
//         const nptPunch = new Date(punchTime.getTime() + NPT_OFFSET_MS);
//         const date = new Date(nptPunch.toISOString().slice(0, 10));
//         date.setHours(0, 0, 0, 0);

//         const user = await User.findOne(
//           { biometricId: String(log.user_id), isActive: true },
//           { _id: 1 },
//         ).lean();
//         if (!user) return;

//         // First punch of day = checkIn, subsequent punches = checkOut
//         const existing = await Attendance.findOne(
//           { u: user._id, d: date },
//           { ci: 1 },
//         ).lean();
//         const checkIn = existing?.ci || punchTime;
//         const checkOut = existing?.ci ? punchTime : null;

//         await upsertRecord(user._id, date, checkIn, checkOut);
//         console.log(
//           `[ZK] Live punch saved — user_id: ${log.user_id} at ${punchTime.toLocaleTimeString()}`,
//         );
//       } catch (e) {
//         console.error("[ZK] RT log error:", e.message);
//       }
//     });

//     console.log("[ZK] Real-time listener active");
//   } catch (err) {
//     console.error("[ZK] RT listener failed:", err.message);
//     _rt = null;
//     _retryTimer = setTimeout(startRealTimeListener, 30_000);
//   }
// };

// const stopRealTimeListener = async () => {
//   if (_retryTimer) {
//     clearTimeout(_retryTimer);
//     _retryTimer = null;
//   }
//   if (_rt) {
//     await safeDisconnect(_rt);
//     _rt = null;
//     console.log("[ZK] Real-time listener stopped");
//   }
// };

// // ─── 3. Push user to device ───────────────────────────────────────────────────

// /**
//  * Called when admin creates/updates a user with a biometricId.
//  * Registers the user on the device so they can enroll their fingerprint.
//  */
// const addUserToDevice = async (biometricId, fullName) => {
//   let dev;
//   try {
//     dev = await getDevice();
//     await dev.setUser(
//       parseInt(biometricId),
//       String(biometricId),
//       fullName.substring(0, 24),
//       "",
//       0,
//       0,
//     );
//     console.log(`[ZK] User pushed to device — biometricId: ${biometricId}`);
//     return { success: true };
//   } catch (err) {
//     console.error("[ZK] addUserToDevice error:", err.message);
//     throw new Error(`Failed to push user to device: ${err.message}`);
//   } finally {
//     await safeDisconnect(dev);
//   }
// };

// // ─── 4. Device queries ────────────────────────────────────────────────────────

// const getDeviceInfo = async () => {
//   let dev;
//   try {
//     dev = await getDevice();
//     return await dev.getInfo();
//   } finally {
//     await safeDisconnect(dev);
//   }
// };

// const getDeviceUsers = async () => {
//   let dev;
//   try {
//     dev = await getDevice();
//     const r = await dev.getUsers();
//     return r.data || [];
//   } finally {
//     await safeDisconnect(dev);
//   }
// };

// const clearDeviceLogs = async () => {
//   let dev;
//   try {
//     dev = await getDevice();
//     await dev.clearAttendanceLog();
//     console.log("[ZK] Device logs cleared");
//     return { success: true };
//   } finally {
//     await safeDisconnect(dev);
//   }
// };

// module.exports = {
//   syncAttendanceLogs,
//   startRealTimeListener,
//   stopRealTimeListener,
//   addUserToDevice,
//   getDeviceInfo,
//   getDeviceUsers,
//   clearDeviceLogs,
//   upsertRecord,
// };
/**
 * services/zkService.js
 *
 * ZKTeco device integration.
 *
 * From your actual device logs, the fields are:
 *   log.user_id      — the biometric ID on device  (e.g. "1", "2")
 *   log.record_time  — punch time as string  (e.g. "Fri May 01 2026 08:33:47 GMT+0545")
 *   log.type         — 0=check-in, 1=check-out (but we use first/last punch logic)
 *
 * How matching works:
 *   Device user_id  →  User.biometricId in MongoDB
 *   Admin sets biometricId when creating/editing a user in the dashboard.
 *   Example: device has user_id "1" → admin sets biometricId "1" for Rabindra
 *            device has user_id "2" → admin sets biometricId "2" for Saphalta
 *
 * When a new user (Saphalta) is added via admin dashboard:
 *   1. Admin creates user in MongoDB, sets biometricId = "2"
 *   2. Saphalta enrolls fingerprint on device (which gives her user_id "2")
 *   3. Next sync automatically picks up her punches and saves to MongoDB
 *   4. She logs in → sees her full check-in/check-out/late/overtime details
 */

const Zkteco = require("zkteco-js");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");
const { toNepaliDate } = require("../utils/nepaliDate");
const {
  upsertBiometricAttendance,
  upsertOvertimeAttendance,
} = require("./attendanceService");
const {
  isLateCheckIn,
  isEarlyCheckOut,
  calculateWorkingMinutes,
  isSaturday,
} = require("../utils/attendanceHelper");

const ZK_IP = process.env.ZK_DEVICE_IP || "192.168.1.201";
const ZK_PORT = parseInt(process.env.ZK_DEVICE_PORT) || 4370;

// ─── Device connect/disconnect ───────────────────────────────────────────────

const getDevice = async () => {
  const dev = new Zkteco(ZK_IP, ZK_PORT, 5200, 5000);
  await dev.createSocket();
  return dev;
};

const safeDisconnect = async (dev) => {
  try {
    if (dev) await dev.disconnect();
  } catch (_) {}
};

// ─── Parse punch time from device log ────────────────────────────────────────

/**
 * The device sends record_time as a date string like:
 * "Fri May 01 2026 08:33:47 GMT+0545 (Nepal Time)"
 * new Date() handles this fine in Node.js.
 */
const parsePunchTime = (log) => {
  const raw = log.record_time;
  if (!raw) return null;
  const t = new Date(raw);
  return isNaN(t.getTime()) ? null : t;
};

const getPunchState = (log) => {
  const value = log?.state ?? log?.punchState ?? log?.punch_state ?? log?.type;
  const state = Number(value);
  return Number.isNaN(state) ? null : state;
};

const isOvertimePunchState = (state) => state === 4 || state === 5;

// ─── Group logs by user+day ───────────────────────────────────────────────────

/**
 * Returns: { "bioId__YYYY-MM-DD": [Date, Date, ...] } sorted asc
 * First = checkIn, Last = checkOut
 */
const NPT_OFFSET_MS = 345 * 60 * 1000; // Nepal = UTC+5:45

const groupByUserDay = (logs) => {
  const map = {};
  for (const log of logs) {
    const t = parsePunchTime(log);
    if (!t) continue;
    // Shift to NPT so punches near midnight group to the correct Nepal date
    const nptDate = new Date(t.getTime() + NPT_OFFSET_MS);
    const day = nptDate.toISOString().slice(0, 10); // "2026-05-01" in NPT
    const k = `${log.user_id}__${day}`;
    if (!map[k]) map[k] = [];
    map[k].push({ time: t, state: getPunchState(log) });
  }
  for (const k of Object.keys(map)) map[k].sort((a, b) => a.time - b.time);
  return map;
};

// ─── Resolve attendance status ────────────────────────────────────────────────

const resolveStatus = (checkIn, isHoliday, isWeekend, isOnLeave) => {
  if (isWeekend) return "W";
  if (isHoliday) return "X";
  if (isOnLeave) return "L";
  if (checkIn) return "P";
  return "A";
};

// ─── Upsert one attendance record ────────────────────────────────────────────

const upsertRecord = async (userId, date, checkIn, checkOut, options = {}) => {
  const { isOvertime = false } = options;
  const [holiday, onLeave] = await Promise.all([
    Holiday.findOne({ date }).lean().select("_id"),
    Leave.findOne({
      user: userId,
      status: "approved",
      fromDate: { $lte: date },
      toDate: { $gte: date },
    })
      .lean()
      .select("_id"),
  ]);

  const weekend = isSaturday(date);
  const status = resolveStatus(checkIn, !!holiday, weekend, !!onLeave);
  const late = checkIn && !weekend && !holiday ? isLateCheckIn(checkIn) : false;
  const earlyOut =
    checkOut && !weekend && !holiday ? isEarlyCheckOut(checkOut) : false;
  const workMins =
    checkIn && checkOut ? calculateWorkingMinutes(checkIn, checkOut) : 0;
  const totalMinutes =
    checkIn && checkOut
      ? Math.floor((new Date(checkOut) - new Date(checkIn)) / 60000)
      : 0;

  // Calculate overtime: working beyond 2 PM (officeEnd)
  // workMins > 360 (6 hrs effective) = overtime
  const STANDARD_WORK_MINS = 360;
  const overtimeMins = isOvertime
    ? totalMinutes
    : workMins > STANDARD_WORK_MINS
      ? workMins - STANDARD_WORK_MINS
      : 0;

  await Attendance.findOneAndUpdate(
    { u: userId, d: date },
    {
      $set: {
        nd: toNepaliDate(date),
        ci: checkIn || null,
        co: checkOut || null,
        wm: workMins,
        ot: overtimeMins, // overtime minutes
        st: status,
        lt: late,
        el: earlyOut,
        src: "b",
      },
    },
    { upsert: true, returnDocument: "after" },
  );
};

// ─── 1. Batch sync ────────────────────────────────────────────────────────────

const syncAttendanceLogs = async () => {
  let dev;
  try {
    console.log(`[ZK] Connecting to ${ZK_IP}:${ZK_PORT}...`);
    dev = await getDevice();

    const { data: logs } = await dev.getAttendances();
    if (!logs || logs.length === 0) {
      console.log("[ZK] No logs on device");
      return { synced: 0, skipped: 0 };
    }
    console.log(`[ZK] ${logs.length} raw punches pulled from device`);

    const grouped = groupByUserDay(logs);
    const allBioIds = [
      ...new Set(Object.keys(grouped).map((k) => k.split("__")[0])),
    ];

    // Fetch matching active users from MongoDB
    const users = await User.find(
      { biometricId: { $in: allBioIds }, isActive: true },
      { _id: 1, biometricId: 1 },
    ).lean();
    const bioMap = {};
    for (const u of users) bioMap[u.biometricId] = u._id;

    let synced = 0,
      skipped = 0;

    for (const [key, punches] of Object.entries(grouped)) {
      const [bioId, dayStr] = key.split("__");
      const userId = bioMap[bioId];
      if (!userId) {
        skipped++;
        continue;
      } // biometricId not assigned in MongoDB yet

      for (const punch of punches) {
        const userIdStr = String(bioId);
        const user = await User.findOne({
          biometricId: userIdStr,
          isActive: true,
        });
        if (!user) continue;

        const punchTime = punch.recordTime || punch.record_time || punch.time;
        const state = punch.state;

        if (state === 4) {
          // Overtime IN
          await upsertOvertimeAttendance({
            userId: user._id,
            punchTime,
            isIn: true,
          });
        } else if (state === 5) {
          // Overtime OUT
          await upsertOvertimeAttendance({
            userId: user._id,
            punchTime,
            isIn: false,
          });
        } else {
          // Normal punch (0, 1, or undefined)
          await upsertBiometricAttendance({
            userId: user._id,
            punchTime,
          });
        }
      }
      synced++;
    }

    console.log(
      `[ZK] Batch sync done — synced: ${synced}, skipped: ${skipped}`,
    );
    return { synced, skipped };
  } catch (err) {
    console.error("[ZK] Batch sync failed:", err.message);
    throw err;
  } finally {
    await safeDisconnect(dev);
  }
};

// ─── 2. Real-time listener ────────────────────────────────────────────────────

let _rt = null;
let _retryTimer = null;

const startRealTimeListener = async () => {
  if (_rt) return;
  try {
    console.log("[ZK] Starting real-time listener...");
    _rt = await getDevice();

    await _rt.getRealTimeLogs(async (log) => {
      try {
        // Real-time log uses record_time too
        const punchTime = parsePunchTime(log);
        if (!punchTime) return;

        // Use NPT date so the record lands on the correct Nepal calendar day
        const nptPunch = new Date(punchTime.getTime() + NPT_OFFSET_MS);
        const date = new Date(
          nptPunch.toISOString().slice(0, 10) + "T00:00:00.000Z",
        ); // force UTC midnight

        const user = await User.findOne(
          { biometricId: String(log.user_id), isActive: true },
          { _id: 1 },
        ).lean();
        if (!user) return;

        const punchState = getPunchState(log);
        if (isOvertimePunchState(punchState)) {
          await upsertOvertimeAttendance({
            userId: user._id,
            punchTime,
            isIn: punchState === 4,
          });
        } else {
          await upsertBiometricAttendance({
            userId: user._id,
            punchTime,
          });
        }
        console.log(
          `[ZK] Live punch saved — user_id: ${log.user_id} at ${punchTime.toLocaleTimeString()}`,
        );
      } catch (e) {
        console.error("[ZK] RT log error:", e.message);
      }
    });

    console.log("[ZK] Real-time listener active");
  } catch (err) {
    console.error("[ZK] RT listener failed:", err.message);
    _rt = null;
    _retryTimer = setTimeout(startRealTimeListener, 30_000);
  }
};

const stopRealTimeListener = async () => {
  if (_retryTimer) {
    clearTimeout(_retryTimer);
    _retryTimer = null;
  }
  if (_rt) {
    await safeDisconnect(_rt);
    _rt = null;
    console.log("[ZK] Real-time listener stopped");
  }
};

// ─── 3. Push user to device ───────────────────────────────────────────────────

/**
 * Called when admin creates/updates a user with a biometricId.
 * Registers the user on the device so they can enroll their fingerprint.
 */
const addUserToDevice = async (biometricId, fullName) => {
  let dev;
  try {
    dev = await getDevice();
    await dev.setUser(
      parseInt(biometricId),
      String(biometricId),
      fullName.substring(0, 24),
      "",
      0,
      0,
    );
    console.log(`[ZK] User pushed to device — biometricId: ${biometricId}`);
    return { success: true };
  } catch (err) {
    console.error("[ZK] addUserToDevice error:", err.message);
    throw new Error(`Failed to push user to device: ${err.message}`);
  } finally {
    await safeDisconnect(dev);
  }
};

// ─── 4. Device queries ────────────────────────────────────────────────────────

const getDeviceInfo = async () => {
  let dev;
  try {
    dev = await getDevice();
    return await dev.getInfo();
  } finally {
    await safeDisconnect(dev);
  }
};

const getDeviceUsers = async () => {
  let dev;
  try {
    dev = await getDevice();
    const r = await dev.getUsers();
    return r.data || [];
  } finally {
    await safeDisconnect(dev);
  }
};

const clearDeviceLogs = async () => {
  let dev;
  try {
    dev = await getDevice();
    await dev.clearAttendanceLog();
    console.log("[ZK] Device logs cleared");
    return { success: true };
  } finally {
    await safeDisconnect(dev);
  }
};

module.exports = {
  syncAttendanceLogs,
  startRealTimeListener,
  stopRealTimeListener,
  addUserToDevice,
  getDeviceInfo,
  getDeviceUsers,
  clearDeviceLogs,
  upsertRecord,
};
