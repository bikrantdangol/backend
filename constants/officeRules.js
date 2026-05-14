// ============================================================
// OFFICE RULES - Edit these values to change office policies
// ============================================================

const OFFICE_RULES = {
  // Office hours (24-hour format)
  OFFICE_START_HOUR: 7,      // 7:00 AM - on time check-in
  OFFICE_START_MINUTE: 0,

  OFFICE_END_HOUR: 14,       // 2:00 PM - on time check-out
  OFFICE_END_MINUTE: 0,

  // Lunch break duration in minutes
  LUNCH_BREAK_MINUTES: 60,

  // Total effective working hours per day (excluding lunch)
  EFFECTIVE_WORK_HOURS: 6,   // 7AM - 2PM = 7hrs - 1hr lunch = 6hrs

  // Leave policy
  MAX_LEAVES_PER_YEAR: 12,
  MAX_LEAVES_PER_MONTH: 1,

  // Day rules
  WEEKLY_OFF_DAY: 6,         // 6 = Saturday

  // Late/Early thresholds
  LATE_THRESHOLD_MINUTES: 0,

  // Roles available in the system
  ROLES: {
    ADMIN:      'admin',
    ACCOUNTANT: 'accountant',
    OFFICER:    'officer',
    MANAGER:    'manager',
    CLERK:      'clerk',
    TELLER:     'teller',
    SUPERVISOR: 'supervisor',
    HR:         'hr',
    COLLECTOR:  'collector',
    HELPER:     'helper',
    STAFF:      'staff',
  },
};

module.exports = OFFICE_RULES;