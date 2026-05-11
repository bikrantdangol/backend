const occasionService = require("../services/occasionService");

// POST /api/occasions - Add occasion (admin)
const addOccasion = async (req, res, next) => {
  try {
    const { userId, type, date, title } = req.body;
    if (!userId || !type || !date) {
      return res
        .status(400)
        .json({ message: "userId, type, and date are required" });
    }
    const occasion = await occasionService.addOccasion(req.user._id, {
      userId,
      type,
      date,
      title,
    });
    res.status(201).json({ message: "Occasion added", occasion });
  } catch (err) {
    next(err);
  }
};

// GET /api/occasions - Get all occasions (all users can see)
const getAllOccasions = async (req, res, next) => {
  try {
    const occasions = await occasionService.getAllOccasions();
    res.status(200).json({ occasions });
  } catch (err) {
    next(err);
  }
};

// GET /api/occasions/upcoming - Upcoming occasions for dashboard
const getUpcomingOccasions = async (req, res, next) => {
  try {
    const occasions = await occasionService.getUpcomingOccasions(
      req.query.days || 7,
    );
    res.status(200).json({ occasions });
  } catch (err) {
    next(err);
  }
};

// GET /api/occasions/user/:userId - Get occasions for a specific user
const getUserOccasions = async (req, res, next) => {
  try {
    const occasions = await occasionService.getUserOccasions(req.params.userId);
    res.status(200).json({ occasions });
  } catch (err) {
    next(err);
  }
};

// PUT /api/occasions/:id - Update occasion (admin)
const updateOccasion = async (req, res, next) => {
  try {
    const occasion = await occasionService.updateOccasion(
      req.params.id,
      req.body,
    );
    res.status(200).json({ message: "Occasion updated", occasion });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/occasions/:id - Delete occasion (admin)
const deleteOccasion = async (req, res, next) => {
  try {
    const result = await occasionService.deleteOccasion(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addOccasion,
  getAllOccasions,
  getUpcomingOccasions,
  getUserOccasions,
  updateOccasion,
  deleteOccasion,
};
