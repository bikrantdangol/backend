require("dotenv").config();
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Holiday = require("../models/Holiday");
const OFFICE_RULES = require("../constants/officeRules");
const { isSaturday } = require("../utils/attendanceHelper");

const NPT_OFFSET_MS = 345 * 60 * 1000; // +5h45m

const calculateRegularDayOvertime = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;

  const startMins =
    OFFICE_RULES.OFFICE_START_HOUR * 60 + OFFICE_RULES.OFFICE_START_MINUTE; // 420
  const endMins =
    OFFICE_RULES.OFFICE_END_HOUR * 60 + OFFICE_RULES.OFFICE_END_MINUTE; // 840

  const ci = new Date(checkIn);
  const co = new Date(checkOut);

  // Times stored as UTC — add NPT offset to get Nepal wall clock time
  const ciNPT = new Date(ci.getTime() + NPT_OFFSET_MS);
  const coNPT = new Date(co.getTime() + NPT_OFFSET_MS);

  const ciMins = ciNPT.getUTCHours() * 60 + ciNPT.getUTCMinutes();
  const coMins = coNPT.getUTCHours() * 60 + coNPT.getUTCMinutes();

  let overtime = 0;
  if (ciMins < startMins) overtime += startMins - ciMins;
  if (coMins > endMins) overtime += coMins - endMins;
  return overtime;
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const holidays = await Holiday.find({}).lean();
  const holidayDates = new Set(
    holidays.map((h) => h.date.toISOString().slice(0, 10)),
  );

  // ✅ Use lean() — plain objects, no mongoose validation
  const records = await Attendance.find({
    ci: { $exists: true, $ne: null },
    co: { $exists: true, $ne: null },
  }).lean();

  console.log(`Found ${records.length} records to process...`);

  // Debug first 3 real records
  const realRecords = records.filter(
    (r) => (r.ci && r.co && r.ci.getTime !== undefined) || true,
  );
  for (let i = 0; i < Math.min(3, realRecords.length); i++) {
    const doc = realRecords[i];
    const ciNPT = new Date(new Date(doc.ci).getTime() + NPT_OFFSET_MS);
    const coNPT = new Date(new Date(doc.co).getTime() + NPT_OFFSET_MS);
    console.log(
      `Record ${i + 1}: CI=${ciNPT.getUTCHours()}:${String(ciNPT.getUTCMinutes()).padStart(2, "0")} NPT | CO=${coNPT.getUTCHours()}:${String(coNPT.getUTCMinutes()).padStart(2, "0")} NPT | st=${doc.st}`,
    );
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of records) {
    try {
      const dayStr = new Date(doc.d).toISOString().slice(0, 10);
      const isOffDay = holidayDates.has(dayStr) || isSaturday(new Date(dayStr));

      let newOt = 0;
      if (isOffDay) {
        newOt = Math.floor((new Date(doc.co) - new Date(doc.ci)) / 60000);
      } else {
        newOt = calculateRegularDayOvertime(doc.ci, doc.co);
      }

      if (doc.ot !== newOt) {
        // ✅ updateOne with $set — bypasses ALL mongoose validation
        await Attendance.collection.updateOne(
          { _id: doc._id },
          { $set: { ot: newOt } },
        );
        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`Error on record ${doc._id}:`, err.message);
      errors++;
    }
  }

  console.log(
    `✅ Done! Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors}`,
  );
  process.exit(0);
})();