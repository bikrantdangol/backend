const userService = require("../services/userService");

// POST /api/users - Create user (admin)
const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ message: "User created successfully", user });
  } catch (err) {
    next(err);
  }
};

// GET /api/users - Get all users (admin)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/dashboard-stats - Admin dashboard stats
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await userService.getDashboardStats();
    res.status(200).json({ stats });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id - Get user by ID
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/:id - Update user (admin)
const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json({ message: "User updated", user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/:id/deactivate - Deactivate user (admin)
const deactivateUser = async (req, res, next) => {
  try {
    const result = await userService.deactivateUser(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/:id/reactivate - Reactivate user (admin)
const reactivateUser = async (req, res, next) => {
  try {
    const result = await userService.reactivateUser(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/:id - Permanently delete user (admin)
const deleteUser = async (req, res, next) => {
  try {
    const result = await userService.deleteUser(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getDashboardStats,
  getUserById,
  updateUser,
  deactivateUser,
  reactivateUser,
  deleteUser,
};
