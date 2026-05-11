// const Occasion = require("../models/Occasion");
// const User = require("../models/User");
// const { toNepaliDate } = require("../utils/nepaliDate");

// /**
//  * Add an occasion for a user (admin only)
//  */
// const addOccasion = async (adminId, { userId, type, date, title }) => {
//   const user = await User.findById(userId);
//   if (!user) throw new Error("User not found");

//   const adDate = new Date(date);
//   const nepaliDate = toNepaliDate(adDate);

//   const occasion = await Occasion.create({
//     user: userId,
//     type,
//     title: title || generateOccasionTitle(type, user.fullName),
//     date: adDate,
//     nepaliDate,
//     dayOfYear_month: adDate.getMonth() + 1,
//     dayOfYear_day: adDate.getDate(),
//     addedBy: adminId,
//   });

//   return await occasion.populate("user", "fullName email role");
// };

// /**
//  * Auto-generate title based on type
//  */
// const generateOccasionTitle = (type, fullName) => {
//   const firstName = fullName.split(" ")[0];
//   switch (type) {
//     case "birthday":
//       return `${firstName}'s Birthday`;
//     case "work_anniversary":
//       return `${firstName}'s Work Anniversary`;
//     default:
//       return `${firstName}'s Special Day`;
//   }
// };

// /**
//  * Get all occasions (visible to all users for dashboard notifications)
//  */
// const getAllOccasions = async () => {
//   return await Occasion.find({ isActive: true })
//     .populate("user", "fullName email role department")
//     .sort({ dayOfYear_month: 1, dayOfYear_day: 1 });
// };

// /**
//  * Get occasions for a specific user
//  */
// const getUserOccasions = async (userId) => {
//   return await Occasion.find({ user: userId, isActive: true }).populate(
//     "user",
//     "fullName",
//   );
// };

// /**
//  * Get today's or upcoming occasions (for dashboard notifications)
//  * Returns occasions happening today and within next N days
//  */
// const getUpcomingOccasions = async (days = 7) => {
//   const today = new Date();
//   const month = today.getMonth() + 1;
//   const day = today.getDate();

//   // Get all occasions and filter by upcoming (within next `days` days) by month/day
//   const all = await Occasion.find({ isActive: true }).populate(
//     "user",
//     "fullName email role department",
//   );

//   const upcoming = [];

//   all.forEach((occ) => {
//     const currentYear = today.getFullYear();
//     // Build this year's occurrence
//     const thisYearDate = new Date(
//       currentYear,
//       occ.dayOfYear_month - 1,
//       occ.dayOfYear_day,
//     );
//     const diff = Math.ceil((thisYearDate - today) / (1000 * 60 * 60 * 24));

//     if (diff >= 0 && diff <= days) {
//       upcoming.push({
//         ...occ.toObject(),
//         daysUntil: diff,
//         isToday: diff === 0,
//         thisYearDate,
//       });
//     }
//   });

//   return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
// };

// /**
//  * Update an occasion (admin only)
//  */
// const updateOccasion = async (occasionId, updateData) => {
//   if (updateData.date) {
//     const adDate = new Date(updateData.date);
//     updateData.nepaliDate = toNepaliDate(adDate);
//     updateData.dayOfYear_month = adDate.getMonth() + 1;
//     updateData.dayOfYear_day = adDate.getDate();
//   }

//   const occasion = await Occasion.findByIdAndUpdate(occasionId, updateData, {
//     new: true,
//     runValidators: true,
//   }).populate("user", "fullName email role");

//   if (!occasion) throw new Error("Occasion not found");
//   return occasion;
// };

// /**
//  * Delete an occasion (admin only)
//  */
// const deleteOccasion = async (occasionId) => {
//   const occasion = await Occasion.findByIdAndDelete(occasionId);
//   if (!occasion) throw new Error("Occasion not found");
//   return { message: "Occasion deleted" };
// };

// module.exports = {
//   addOccasion,
//   getAllOccasions,
//   getUserOccasions,
//   getUpcomingOccasions,
//   updateOccasion,
//   deleteOccasion,
// };
/**
 * services/occasionService.js
 * Occasion CRUD + notification trigger on add
 */

const Occasion = require("../models/Occasion");
const User = require("../models/User");
const { toNepaliDate } = require("../utils/nepaliDate");
const { createOccasionNotif } = require("./notificationService");

const generateTitle = (type, fullName) => {
  const first = fullName.split(" ")[0];
  if (type === "birthday") return `${first}'s Birthday`;
  if (type === "work_anniversary") return `${first}'s Work Anniversary`;
  return `${first}'s Special Day`;
};

const addOccasion = async (adminId, { userId, type, date, title }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const adDate = new Date(date);
  const nepaliDate = toNepaliDate(adDate);

  const occasion = await Occasion.create({
    user: userId,
    type,
    title: title || generateTitle(type, user.fullName),
    date: adDate,
    nepaliDate,
    dayOfYear_month: adDate.getMonth() + 1,
    dayOfYear_day: adDate.getDate(),
    addedBy: adminId,
  });

  await occasion.populate("user", "fullName email role");

  // Notify all active users about this occasion
  await createOccasionNotif(occasion, user.fullName).catch((e) =>
    console.error("[Notif] occasion:", e.message),
  );

  return occasion;
};

const getAllOccasions = async () => {
  return await Occasion.find({ isActive: true })
    .populate("user", "fullName email role department")
    .sort({ dayOfYear_month: 1, dayOfYear_day: 1 });
};

const getUserOccasions = async (userId) => {
  return await Occasion.find({ user: userId, isActive: true }).populate(
    "user",
    "fullName",
  );
};

const getUpcomingOccasions = async (days = 7) => {
  const today = new Date();
  const all = await Occasion.find({ isActive: true }).populate(
    "user",
    "fullName email role department",
  );

  const upcoming = [];
  all.forEach((occ) => {
    const thisYear = new Date(
      today.getFullYear(),
      occ.dayOfYear_month - 1,
      occ.dayOfYear_day,
    );
    const diff = Math.ceil((thisYear - today) / 86400000);
    if (diff >= 0 && diff <= days)
      upcoming.push({
        ...occ.toObject(),
        daysUntil: diff,
        isToday: diff === 0,
        thisYearDate: thisYear,
      });
  });

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
};

const updateOccasion = async (occasionId, updateData) => {
  if (updateData.date) {
    const adDate = new Date(updateData.date);
    updateData.nepaliDate = toNepaliDate(adDate);
    updateData.dayOfYear_month = adDate.getMonth() + 1;
    updateData.dayOfYear_day = adDate.getDate();
  }
  const occasion = await Occasion.findByIdAndUpdate(occasionId, updateData, {
    new: true,
    runValidators: true,
  }).populate("user", "fullName email role");
  if (!occasion) throw new Error("Occasion not found");
  return occasion;
};

const deleteOccasion = async (occasionId) => {
  const occasion = await Occasion.findByIdAndDelete(occasionId);
  if (!occasion) throw new Error("Occasion not found");
  return { message: "Occasion deleted" };
};

module.exports = {
  addOccasion,
  getAllOccasions,
  getUserOccasions,
  getUpcomingOccasions,
  updateOccasion,
  deleteOccasion,
};
