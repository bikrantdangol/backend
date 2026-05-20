// scripts/recalculateOvertime.js
require("dotenv").config();
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Holiday = require("../models/Holiday");
const OFFICE_RULES = require("../constants/officeRules");
const {
  isSaturday,
  calculateWorkingMinutes,
} = require("../utils/attendanceHelper");

const NPT_OFFSET_MS = 345 * 60 * 1000;

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
  if (ciTotalMins < startMins) overtime += startMins - ciTotalMins;
  if (coTotalMins > endMins) overtime += coTotalMins - endMins;
  return overtime;
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const holidays = await Holiday.find({}).lean();
  const holidayDates = new Set(
    holidays.map((h) => h.date.toISOString().slice(0, 10)),
  );

  const cursor = Attendance.find({
    ci: { $exists: true },
    co: { $exists: true },
  }).cursor();
  let updated = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const dayStr = doc.d.toISOString().slice(0, 10);
    const isOffDay = holidayDates.has(dayStr) || isSaturday(new Date(dayStr));

    let newOt = 0;
    if (isOffDay) {
      // all time is overtime
      newOt = Math.floor((new Date(doc.co) - new Date(doc.ci)) / 60000);
    } else {
      // regular day – compute overtime before 7am / after 2pm
      newOt = calculateRegularDayOvertime(doc.ci, doc.co);
      // working minutes should already be correct, but we can also recalc if needed
      // doc.wm = calculateWorkingMinutes(doc.ci, doc.co);
    }

    if (doc.ot !== newOt) {
      doc.ot = newOt;
      await doc.save();
      updated++;
    }
  }

  console.log(`Updated ${updated} attendance records.`);
  process.exit(0);
})();