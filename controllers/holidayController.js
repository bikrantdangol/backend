// ===================== holidayController.js =====================
const holidayService = require("../services/holidayService");

const addHoliday = async (req, res, next) => {
  try {
    const { title, occasion, date } = req.body;
    if (!title || !date)
      return res.status(400).json({ message: "title and date are required" });
    const holiday = await holidayService.addHoliday(req.user._id, {
      title,
      occasion,
      date,
    });
    res.status(201).json({ message: "Holiday added", holiday });
  } catch (err) {
    next(err);
  }
};

const addMassHoliday = async (req, res, next) => {
  try {
    const { title, occasion, dates } = req.body;
    if (!title || !dates || !Array.isArray(dates) || dates.length === 0) {
      return res
        .status(400)
        .json({ message: "title and dates array are required" });
    }

    const holidays = await holidayService.addMassHoliday(req.user._id, {
      title,
      occasion,
      dates,
    });

    res.status(201).json({ message: "Holidays added", holidays });
  } catch (err) {
    next(err);
  }
};

const getHolidaysByYear = async (req, res, next) => {
  try {
    const { nepaliYear } = req.query;
    if (!nepaliYear)
      return res.status(400).json({ message: "nepaliYear is required" });
    const holidays = await holidayService.getHolidaysByYear(Number(nepaliYear));
    res.status(200).json({ holidays });
  } catch (err) {
    next(err);
  }
};

const getUpcomingHolidays = async (req, res, next) => {
  try {
    const holidays = await holidayService.getUpcomingHolidays(
      req.query.limit || 5,
    );
    res.status(200).json({ holidays });
  } catch (err) {
    next(err);
  }
};

const updateHoliday = async (req, res, next) => {
  try {
    const holiday = await holidayService.updateHoliday(req.params.id, req.body);
    res.status(200).json({ message: "Holiday updated", holiday });
  } catch (err) {
    next(err);
  }
};

const deleteHoliday = async (req, res, next) => {
  try {
    const result = await holidayService.deleteHoliday(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addHoliday,
  addMassHoliday,
  getHolidaysByYear,
  getUpcomingHolidays,
  updateHoliday,
  deleteHoliday,
};
