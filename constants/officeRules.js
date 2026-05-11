// ============================================================
// OFFICE RULES - Edit these values to change office policies
// ============================================================

const OFFICE_RULES = {
  // Office hours (24-hour format)
  OFFICE_START_HOUR: 7, // 7:00 AM - on time check-in
  OFFICE_START_MINUTE: 0,

  OFFICE_END_HOUR: 14, // 2:00 PM - on time check-out
  OFFICE_END_MINUTE: 0,

  // Lunch break duration in minutes
  LUNCH_BREAK_MINUTES: 60,

  // Total effective working hours per day (excluding lunch)
  EFFECTIVE_WORK_HOURS: 6, // 7AM - 2PM = 7hrs - 1hr lunch = 6hrs

  // Leave policy
  MAX_LEAVES_PER_YEAR: 12, // Max leave days per year
  MAX_LEAVES_PER_MONTH: 1, // Max leave days per month (normal)

  // Day rules
  WEEKLY_OFF_DAY: 6, // 6 = Saturday (0=Sun, 1=Mon ... 6=Sat)

  // Late/Early thresholds (in minutes after/before office time)
  LATE_THRESHOLD_MINUTES: 0, // 0 means exactly 7:00 AM; any minute after = late

  // Roles available in the system
  ROLES: {
    ADMIN: "admin",
    ACCOUNTANT: "accountant",
    OFFICER: "officer",
    MANAGER: "manager",
    CLERK: "clerk",
    TELLER: "teller",
    SUPERVISOR: "supervisor",
    HR: "hr",
    COLLECTOR: "collector", // ← new
    HELPER: "helper", // ← new
    STAFF: "staff",
  },
};

module.exports = OFFICE_RULES;
