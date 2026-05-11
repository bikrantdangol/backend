// const mongoose = require("mongoose");

// const attendanceSchema = new mongoose.Schema(
//   {
//     u: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // user
//     d: { type: Date, required: true }, // date (midnight UTC)
//     nd: { type: String, required: true }, // nepali date "2083-09-15"
//     ci: { type: Date, default: null }, // checkIn
//     co: { type: Date, default: null }, // checkOut
//     wm: { type: Number, default: 0 }, // working minutes (Int32)

//     // 1-char status codes to minimize string storage
//     // 'P'=present  'A'=absent  'H'=half-day
//     // 'L'=on-leave 'X'=holiday 'W'=weekend
//     st: { type: String, default: "A", maxlength: 1 },

//     lt: { type: Boolean, default: false }, // isLate
//     el: { type: Boolean, default: false }, // isEarlyLeave

//     // source: 'b'=biometric, 'm'=manual, 's'=system
//     src: { type: String, default: "s", maxlength: 1 },
//   },
//   {
//     timestamps: false, // skip createdAt/updatedAt — saves ~16 bytes per doc
//     versionKey: false, // skip __v — saves ~12 bytes per doc
//     collection: "att", // short collection name
//   },
// );

// // One record per user per day
// attendanceSchema.index({ u: 1, d: 1 }, { unique: true });
// // For admin "all users today" queries
// attendanceSchema.index({ d: 1 });

// /**
//  * Static helpers so controllers don't have to know the short field names
//  */
// attendanceSchema.statics.STATUS = {
//   PRESENT: "P",
//   ABSENT: "A",
//   HALF_DAY: "H",
//   ON_LEAVE: "L",
//   HOLIDAY: "X",
//   WEEKEND: "W",
// };

// /**
//  * Decode short field names to readable object for API responses.
//  * Call doc.toAPI() before sending to frontend.
//  */
// attendanceSchema.methods.toAPI = function () {
//   const STATUS_LABEL = {
//     P: "present",
//     A: "absent",
//     H: "half-day",
//     L: "on-leave",
//     X: "holiday",
//     W: "weekend",
//   };
//   return {
//     _id: this._id,
//     user: this.u,
//     date: this.d,
//     nepaliDate: this.nd,
//     checkIn: this.ci,
//     checkOut: this.co,
//     workingMinutes: this.wm,
//     status: STATUS_LABEL[this.st] || this.st,
//     isLate: this.lt,
//     isEarlyLeave: this.el,
//     source:
//       this.src === "b" ? "biometric" : this.src === "m" ? "manual" : "system",
//   };
// };

// const Attendance = mongoose.model("Attendance", attendanceSchema);
// module.exports = Attendance;
/**
 * models/Attendance.js
 *
 * Short field names to save MongoDB storage.
 * u=user, d=date, nd=nepaliDate, ci=checkIn, co=checkOut
 * wm=workingMinutes, ot=overtimeMinutes
 * st=status (P/A/H/L/X/W), lt=isLate, el=isEarlyLeave, src=source
 */

const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    u: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    d: { type: Date, required: true }, // date midnight UTC
    nd: { type: String, required: true }, // nepali date "2083-01-19"
    ci: { type: Date, default: null }, // checkIn time
    co: { type: Date, default: null }, // checkOut time
    wm: { type: Number, default: 0 }, // working minutes
    ot: { type: Number, default: 0 }, // overtime minutes (beyond 6 hrs)

    // P=present A=absent H=half-day L=on-leave X=holiday W=weekend
    st: { type: String, default: "A", maxlength: 1 },

    lt: { type: Boolean, default: false }, // late check-in (after 7AM)
    el: { type: Boolean, default: false }, // early leave (before 2PM)

    // b=biometric m=manual s=system
    src: { type: String, default: "s", maxlength: 1 },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "att",
  },
);

// One record per user per day
attendanceSchema.index({ u: 1, d: 1 }, { unique: true });
attendanceSchema.index({ d: 1 });

attendanceSchema.statics.STATUS = {
  PRESENT: "P",
  ABSENT: "A",
  HALF_DAY: "H",
  ON_LEAVE: "L",
  HOLIDAY: "X",
  WEEKEND: "W",
};

// Convert short fields to readable object for API responses
attendanceSchema.methods.toAPI = function () {
  const STATUS_LABEL = {
    P: "present",
    A: "absent",
    H: "half-day",
    L: "on-leave",
    X: "holiday",
    W: "weekend",
  };
  return {
    _id: this._id,
    user: this.u,
    date: this.d,
    nepaliDate: this.nd,
    checkIn: this.ci,
    checkOut: this.co,
    ot: { type: Number, default: 0 },
    workingMinutes: this.wm,
    overtimeMinutes: this.ot,
    status: STATUS_LABEL[this.st] || this.st,
    isLate: this.lt,
    isEarlyLeave: this.el,
    source:
      this.src === "b" ? "biometric" : this.src === "m" ? "manual" : "system",
  };
};

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;
