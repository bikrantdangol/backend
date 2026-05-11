// const Holiday = require("../models/Holiday");
// const {
//   toNepaliDate,
//   getNepaliYear,
//   todayNepali,
// } = require("../utils/nepaliDate");

// /**
//  * Add a holiday (admin only)
//  */
// const addHoliday = async (adminId, { title, occasion, date }) => {
//   const adDate = new Date(date);
//   adDate.setHours(0, 0, 0, 0);

//   const nepaliDate = toNepaliDate(adDate);
//   const nepaliYear = getNepaliYear(adDate);

//   const existing = await Holiday.findOne({ date: adDate });
//   if (existing) throw new Error("A holiday already exists on this date");

//   const holiday = await Holiday.create({
//     title,
//     occasion: occasion || null,
//     date: adDate,
//     nepaliDate,
//     nepaliYear,
//     addedBy: adminId,
//   });

//   return holiday;
// };

// /**
//  * Get all holidays for a Nepali year
//  */
// const getHolidaysByYear = async (nepaliYear) => {
//   return await Holiday.find({ nepaliYear })
//     .populate("addedBy", "fullName")
//     .sort({ date: 1 });
// };

// /**
//  * Get upcoming holidays (from today onwards)
//  */
// const getUpcomingHolidays = async (limit = 5) => {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   return await Holiday.find({ date: { $gte: today } })
//     .populate("addedBy", "fullName")
//     .sort({ date: 1 })
//     .limit(limit);
// };

// /**
//  * Delete a holiday (admin only)
//  */
// const deleteHoliday = async (holidayId) => {
//   const holiday = await Holiday.findByIdAndDelete(holidayId);
//   if (!holiday) throw new Error("Holiday not found");
//   return { message: `Holiday "${holiday.title}" deleted` };
// };

// /**
//  * Update a holiday (admin only)
//  */
// const updateHoliday = async (holidayId, updateData) => {
//   // Recalculate nepali date if date changed
//   if (updateData.date) {
//     const adDate = new Date(updateData.date);
//     adDate.setHours(0, 0, 0, 0);
//     updateData.nepaliDate = toNepaliDate(adDate);
//     updateData.nepaliYear = getNepaliYear(adDate);
//     updateData.date = adDate;
//   }

//   const holiday = await Holiday.findByIdAndUpdate(holidayId, updateData, {
//     new: true,
//     runValidators: true,
//   }).populate("addedBy", "fullName");

//   if (!holiday) throw new Error("Holiday not found");
//   return holiday;
// };

// /**
//  * Check if a specific AD date is a holiday
//  */
// const isHolidayDate = async (date) => {
//   const adDate = new Date(date);
//   adDate.setHours(0, 0, 0, 0);
//   const holiday = await Holiday.findOne({ date: adDate });
//   return holiday || null;
// };

// /**
//  * Get holidays within a date range (for attendance calculations)
//  */
// const getHolidaysInRange = async (startDate, endDate) => {
//   return await Holiday.find({
//     date: { $gte: new Date(startDate), $lte: new Date(endDate) },
//   }).sort({ date: 1 });
// };

// module.exports = {
//   addHoliday,
//   getHolidaysByYear,
//   getUpcomingHolidays,
//   deleteHoliday,
//   updateHoliday,
//   isHolidayDate,
//   getHolidaysInRange,
// };
/**
 * services/holidayService.js
 * Holiday CRUD + notification trigger on add
 */

const Holiday = require("../models/Holiday");
const Notification = require("../models/Notification");
const NepaliDate = require("nepali-date-converter").default;
const { toNepaliDate, getNepaliYear } = require("../utils/nepaliDate");
const { createHolidayNotif } = require("./notificationService");

const addHoliday = async (adminId, { title, occasion, date }) => {
  let adDate;
  const parts = date.split("-");
  const year = parseInt(parts[0], 10);

  if (year > 2000) {
    try {
      const nd = new NepaliDate(
        year,
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
      );
      adDate = nd.toJsDate();
    } catch (err) {
      throw new Error("Invalid Nepali date: " + date);
    }
  } else {
    adDate = new Date(date);
  }

  adDate.setHours(0, 0, 0, 0);
  const nepaliDate = toNepaliDate(adDate);
  const nepaliYear = getNepaliYear(adDate);

  const existing = await Holiday.findOne({ date: adDate });
  if (existing) throw new Error("A holiday already exists on this date");

  const holiday = await Holiday.create({
    title,
    occasion: occasion || null,
    date: adDate,
    nepaliDate,
    nepaliYear,
    addedBy: adminId,
  });

  // Notify all active users about the new holiday
  await createHolidayNotif(holiday).catch((e) =>
    console.error("[Notif] holiday added:", e.message),
  );

  return holiday;
};

const addMassHoliday = async (adminId, { title, occasion, dates }) => {
  const created = [];
  const NepaliDate = require("nepali-date-converter").default;

  for (const dateStr of dates) {
    let adDate;
    const parts = dateStr.split("-");
    const year = parseInt(parts[0], 10);

    if (year > 2000) {
      // BS date -> convert to AD
      try {
        const nd = new NepaliDate(
          year,
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
        );
        adDate = nd.toJsDate();
      } catch (err) {
        console.error("Invalid BS date skipped:", dateStr);
        continue; // skip invalid dates silently
      }
    } else {
      adDate = new Date(dateStr);
    }

    adDate.setHours(0, 0, 0, 0);
    const nepaliDate = toNepaliDate(adDate);
    const nepaliYear = getNepaliYear(adDate);

    const existing = await Holiday.findOne({ date: adDate });
    if (existing) continue;

    const holiday = await Holiday.create({
      title,
      occasion: occasion || null,
      date: adDate,
      nepaliDate,
      nepaliYear,
      addedBy: adminId,
    });

    await createHolidayNotif(holiday).catch((e) =>
      console.error("[Notif] mass holiday:", e.message),
    );

    created.push(holiday);
  }

  return created;
};

const getHolidaysByYear = async (nepaliYear) => {
  return await Holiday.find({ nepaliYear })
    .populate("addedBy", "fullName")
    .sort({ date: 1 });
};

const getUpcomingHolidays = async (limit = 5) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return await Holiday.find({ date: { $gte: today } })
    .populate("addedBy", "fullName")
    .sort({ date: 1 })
    .limit(limit);
};

const updateHoliday = async (holidayId, updateData) => {
  if (updateData.date) {
    const date = updateData.date;
    let adDate;
    const parts = date.split("-");
    const year = parseInt(parts[0], 10);

    if (year > 2000) {
      try {
        const nd = new NepaliDate(
          year,
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
        );
        adDate = nd.toJsDate();
      } catch (err) {
        throw new Error("Invalid Nepali date: " + date);
      }
    } else {
      adDate = new Date(date);
    }

    adDate.setHours(0, 0, 0, 0);
    updateData.nepaliDate = toNepaliDate(adDate);
    updateData.nepaliYear = getNepaliYear(adDate);
    updateData.date = adDate;
  }
  const holiday = await Holiday.findByIdAndUpdate(holidayId, updateData, {
    new: true,
    runValidators: true,
  }).populate("addedBy", "fullName");
  if (!holiday) throw new Error("Holiday not found");
  return holiday;
};

const deleteHoliday = async (holidayId) => {
  // Remove all notifications that reference this holiday
  await Notification.deleteMany({ refModel: "Holiday", refId: holidayId });

  const holiday = await Holiday.findByIdAndDelete(holidayId);
  if (!holiday) throw new Error("Holiday not found");
  return { message: `Holiday "${holiday.title}" deleted` };
};

const isHolidayDate = async (date) => {
  const adDate = new Date(date);
  adDate.setHours(0, 0, 0, 0);
  return await Holiday.findOne({ date: adDate });
};

const getHolidaysInRange = async (startDate, endDate) => {
  return await Holiday.find({
    date: { $gte: new Date(startDate), $lte: new Date(endDate) },
  }).sort({ date: 1 });
};

module.exports = {
  addHoliday,
  addMassHoliday,
  getHolidaysByYear,
  getUpcomingHolidays,
  updateHoliday,
  deleteHoliday,
  isHolidayDate,
  getHolidaysInRange,
};
