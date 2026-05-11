const leaveService = require("../services/leaveService");

// POST /api/leave — submit leave request
const requestLeave = async (req, res, next) => {
  try {
    const { fromDate, toDate, reason, leaveType } = req.body;
    if (!fromDate || !toDate || !reason) {
      return res
        .status(400)
        .json({ message: "fromDate, toDate, and reason are required" });
    }
    const leave = await leaveService.requestLeave(req.user._id, {
      fromDate,
      toDate,
      reason,
      leaveType,
    });
    res
      .status(201)
      .json({ message: "Leave request submitted successfully", leave });
  } catch (err) {
    next(err);
  }
};

// GET /api/leave/my — user's own leave requests (?leaveYear=2083 optional)
const getMyLeaves = async (req, res, next) => {
  try {
    const leaves = await leaveService.getUserLeaves(req.user._id, req.query);
    res.json({ leaves });
  } catch (err) {
    next(err);
  }
};

// GET /api/leave/balance — current leave balance with carry-forward
// Returns: accrued, used, availableNow, remainingForYear
const getMyLeaveBalance = async (req, res, next) => {
  try {
    const balance = await leaveService.getLeaveBalance(
      req.user._id,
      req.query.nepaliYear,
    );
    res.json({ balance });
  } catch (err) {
    next(err);
  }
};

// GET /api/leave/breakdown — month-by-month allocation for the year
// Frontend can use to show calendar of leave balance per month
const getMyMonthlyBreakdown = async (req, res, next) => {
  try {
    const breakdown = await leaveService.getMonthlyBreakdown(
      req.user._id,
      req.query.nepaliYear,
    );
    res.json({ breakdown });
  } catch (err) {
    next(err);
  }
};

// GET /api/leave/history — all years grouped
const getMyLeaveHistory = async (req, res, next) => {
  try {
    const history = await leaveService.getUserLeaveHistory(req.user._id);
    res.json({ history });
  } catch (err) {
    next(err);
  }
};

// GET /api/leave/all — admin: all leave requests (?status=pending &leaveYear=2083 optional)
const getAllLeaves = async (req, res, next) => {
  try {
    const leaves = await leaveService.getAllLeaves(req.query);
    res.json({ leaves });
  } catch (err) {
    next(err);
  }
};

// PUT /api/leave/:id/approve — admin: approve
const approveLeave = async (req, res, next) => {
  try {
    const leave = await leaveService.approveLeave(
      req.params.id,
      req.user._id,
      req.body.adminNote,
    );
    res.json({ message: "Leave approved", leave });
  } catch (err) {
    next(err);
  }
};

// PUT /api/leave/:id/reject — admin: reject
const rejectLeave = async (req, res, next) => {
  try {
    const leave = await leaveService.rejectLeave(
      req.params.id,
      req.user._id,
      req.body.adminNote,
    );
    res.json({ message: "Leave rejected", leave });
  } catch (err) {
    next(err);
  }
};
// DELETE /api/leave/:id
const deleteLeave = async (req, res, next) => {
  try {
    const result = await leaveService.deleteLeave(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requestLeave,
  getMyLeaves,
  getMyLeaveBalance,
  getMyMonthlyBreakdown,
  getMyLeaveHistory,
  getAllLeaves,
  deleteLeave,
  approveLeave,
  rejectLeave,
};
