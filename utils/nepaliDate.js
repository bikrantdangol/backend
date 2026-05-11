// const NepaliDate = require("nepali-date-converter");

// /**
//  * Convert AD Date to Nepali (BS) date string "YYYY-MM-DD"
//  */
// const toNepaliDate = (adDate) => {
//   try {
//     const nd = new NepaliDate(adDate);
//     const y = nd.getYear();
//     const m = String(nd.getMonth() + 1).padStart(2, "0");
//     const d = String(nd.getDate()).padStart(2, "0");
//     return `${y}-${m}-${d}`;
//   } catch (err) {
//     console.error("Nepali date conversion error:", err.message);
//     return null;
//   }
// };

// /** Get current Nepali date string e.g. "2083-09-15" */
// const todayNepali = () => toNepaliDate(new Date());

// /**
//  * Get Nepali year from a JS Date.
//  * Called with no arg → returns the CURRENT Nepali year (2083, 2084, etc.)
//  * This is the single source of truth for "what year is it in BS right now"
//  */
// const getNepaliYear = (adDate) => {
//   try {
//     const nd = new NepaliDate(adDate || new Date());
//     return nd.getYear();
//   } catch {
//     return null;
//   }
// };

// /** Get Nepali month (1-indexed) from a JS Date */
// const getNepaliMonth = (adDate) => {
//   try {
//     const nd = new NepaliDate(adDate || new Date());
//     return nd.getMonth() + 1;
//   } catch {
//     return null;
//   }
// };

// /** Get Nepali day of month from a JS Date */
// const getNepaliDay = (adDate) => {
//   try {
//     const nd = new NepaliDate(adDate || new Date());
//     return nd.getDate();
//   } catch {
//     return null;
//   }
// };

// const NEPALI_MONTHS = [
//   "Baisakh",
//   "Jestha",
//   "Ashadh",
//   "Shrawan",
//   "Bhadra",
//   "Ashwin",
//   "Kartik",
//   "Mangsir",
//   "Poush",
//   "Magh",
//   "Falgun",
//   "Chaitra",
// ];

// const getNepaliMonthName = (monthNumber) =>
//   NEPALI_MONTHS[monthNumber - 1] || "";
// const getNepaliMonths = () => NEPALI_MONTHS;

// /**
//  * Get current Nepali year + month as an object.
//  * Useful for defaulting report queries to "this month".
//  */
// const currentNepaliPeriod = () => {
//   const now = new Date();
//   return {
//     year: getNepaliYear(now),
//     month: getNepaliMonth(now),
//     day: getNepaliDay(now),
//     dateString: todayNepali(),
//   };
// };

// /** Get AD date range for a given BS year-month */
// const getADRangeForNepaliMonth = (nepaliYear, nepaliMonth) => {
//   const startBS = new NepaliDate(nepaliYear, nepaliMonth - 1, 1);
//   const startAD = startBS.toJsDate();

//   let endMonth = nepaliMonth;
//   let endYear = nepaliYear;
//   if (nepaliMonth === 12) {
//     endMonth = 1;
//     endYear += 1;
//   } else {
//     endMonth += 1;
//   }

//   const endBS = new NepaliDate(endYear, endMonth - 1, 1);
//   const endAD = new Date(endBS.toJsDate().getTime() - 24 * 60 * 60 * 1000);
//   return { startAD, endAD };
// };

// /** Get AD date range for a full BS year */
// const getADRangeForNepaliYear = (nepaliYear) => {
//   const startBS = new NepaliDate(nepaliYear, 0, 1);
//   const startAD = startBS.toJsDate();
//   const endBS = new NepaliDate(nepaliYear + 1, 0, 1);
//   const endAD = new Date(endBS.toJsDate().getTime() - 24 * 60 * 60 * 1000);
//   return { startAD, endAD };
// };

// module.exports = {
//   toNepaliDate,
//   todayNepali,
//   getNepaliYear,
//   getNepaliMonth,
//   getNepaliDay,
//   getNepaliMonthName,
//   getNepaliMonths,
//   currentNepaliPeriod,
//   getADRangeForNepaliMonth,
//   getADRangeForNepaliYear,
// };

/**
 * utils/nepaliDate.js
 * Fixed import — nepali-date-converter exports as { NepaliDate } not default
 */

// const NepaliDate = require("nepali-date-converter").default;

// const toNepaliDate = (adDate) => {
//   try {
//     const nd = new NepaliDate(new Date(adDate));
//     const y = nd.getYear();
//     const m = String(nd.getMonth() + 1).padStart(2, "0");
//     const d = String(nd.getDate()).padStart(2, "0");
//     return `${y}-${m}-${d}`;
//   } catch (err) {
//     console.error("Nepali date conversion error:", err.message);
//     return null;
//   }
// };

// const todayNepali = () => toNepaliDate(new Date());

// const getNepaliYear = (adDate) => {
//   try {
//     return new NepaliDate(new Date(adDate || new Date())).getYear();
//   } catch {
//     return null;
//   }
// };

// const getNepaliMonth = (adDate) => {
//   try {
//     return new NepaliDate(new Date(adDate || new Date())).getMonth() + 1;
//   } catch {
//     return null;
//   }
// };

// const getNepaliDay = (adDate) => {
//   try {
//     return new NepaliDate(new Date(adDate || new Date())).getDate();
//   } catch {
//     return null;
//   }
// };

// const NEPALI_MONTHS = [
//   "Baisakh",
//   "Jestha",
//   "Ashadh",
//   "Shrawan",
//   "Bhadra",
//   "Ashwin",
//   "Kartik",
//   "Mangsir",
//   "Poush",
//   "Magh",
//   "Falgun",
//   "Chaitra",
// ];

// const getNepaliMonthName = (monthNumber) =>
//   NEPALI_MONTHS[monthNumber - 1] || "";
// const getNepaliMonths = () => NEPALI_MONTHS;

// const currentNepaliPeriod = () => {
//   const now = new Date();
//   return {
//     year: getNepaliYear(now),
//     month: getNepaliMonth(now),
//     day: getNepaliDay(now),
//     dateString: todayNepali(),
//   };
// };

// const getADRangeForNepaliMonth = (nepaliYear, nepaliMonth) => {
//   const startBS = new NepaliDate(nepaliYear, nepaliMonth - 1, 1);
//   const startAD = startBS.toJsDate();
//   let endMonth = nepaliMonth === 12 ? 1 : nepaliMonth + 1;
//   let endYear = nepaliMonth === 12 ? nepaliYear + 1 : nepaliYear;
//   const endBS = new NepaliDate(endYear, endMonth - 1, 1);
//   const endAD = new Date(endBS.toJsDate().getTime() - 86400000);
//   return { startAD, endAD };
// };

// const getADRangeForNepaliYear = (nepaliYear) => {
//   const startAD = new NepaliDate(nepaliYear, 0, 1).toJsDate();
//   const endAD = new Date(
//     new NepaliDate(nepaliYear + 1, 0, 1).toJsDate().getTime() - 86400000,
//   );
//   return { startAD, endAD };
// };

// module.exports = {
//   toNepaliDate,
//   todayNepali,
//   getNepaliYear,
//   getNepaliMonth,
//   getNepaliDay,
//   getNepaliMonthName,
//   getNepaliMonths,
//   currentNepaliPeriod,
//   getADRangeForNepaliMonth,
//   getADRangeForNepaliYear,
// };
/**
 * utils/nepaliDate.js
 *
 * CONFIRMED: nepali-date-converter exports as module.exports.default
 * Correct usage: require('nepali-date-converter').default
 */

const NepaliDate = require("nepali-date-converter").default;

const toNepaliDate = (adDate) => {
  try {
    const nd = new NepaliDate(new Date(adDate));
    const y = nd.getYear();
    const m = String(nd.getMonth() + 1).padStart(2, "0");
    const d = String(nd.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch (err) {
    console.error("Nepali date conversion error:", err.message);
    return null;
  }
};

/**
 * Convert Nepali (BS) date string to AD Date object
 * Input format: "YYYY-MM-DD" (e.g., "2083-01-24")
 * Returns: JavaScript Date object
 */
const nepaliToAD = (nepaliDateStr) => {
  try {
    if (!nepaliDateStr) throw new Error("Date is required");

    const parts = nepaliDateStr.split("-");
    if (parts.length !== 3) throw new Error("Invalid date format");

    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);

    const nd = new NepaliDate(year, month - 1, day);

    return nd.toJsDate();
  } catch (err) {
    console.error("Nepali to AD conversion error:", err.message);
    throw new Error(`Invalid Nepali date: ${nepaliDateStr}`);
  }
};

const todayNepali = () => toNepaliDate(new Date());

const getNepaliYear = (adDate) => {
  try {
    return new NepaliDate(new Date(adDate || new Date())).getYear();
  } catch {
    return null;
  }
};

const getNepaliMonth = (adDate) => {
  try {
    return new NepaliDate(new Date(adDate || new Date())).getMonth() + 1;
  } catch {
    return null;
  }
};

const getNepaliDay = (adDate) => {
  try {
    return new NepaliDate(new Date(adDate || new Date())).getDate();
  } catch {
    return null;
  }
};

const NEPALI_MONTHS = [
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

const getNepaliMonthName = (n) => NEPALI_MONTHS[n - 1] || "";
const getNepaliMonths = () => NEPALI_MONTHS;

const currentNepaliPeriod = () => {
  const now = new Date();
  return {
    year: getNepaliYear(now),
    month: getNepaliMonth(now),
    day: getNepaliDay(now),
    dateString: todayNepali(),
  };
};

const getADRangeForNepaliMonth = (nepaliYear, nepaliMonth) => {
  const startAD = new NepaliDate(nepaliYear, nepaliMonth - 1, 1).toJsDate();
  const eY = nepaliMonth === 12 ? nepaliYear + 1 : nepaliYear;
  const eM = nepaliMonth === 12 ? 0 : nepaliMonth;
  const endAD = new Date(
    new NepaliDate(eY, eM, 1).toJsDate().getTime() - 86400000,
  );
  return { startAD, endAD };
};

const getADRangeForNepaliYear = (nepaliYear) => {
  const startAD = new NepaliDate(nepaliYear, 0, 1).toJsDate();
  const endAD = new Date(
    new NepaliDate(nepaliYear + 1, 0, 1).toJsDate().getTime() - 86400000,
  );
  return { startAD, endAD };
};

module.exports = {
  toNepaliDate,
  nepaliToAD,
  todayNepali,
  getNepaliYear,
  getNepaliMonth,
  getNepaliDay,
  getNepaliMonthName,
  getNepaliMonths,
  currentNepaliPeriod,
  getADRangeForNepaliMonth,
  getADRangeForNepaliYear,
};
