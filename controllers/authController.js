const {
  registerAdmin,
  loginUser,
  changePassword,
} = require("../services/authService");

// POST /api/auth/register-admin
const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ message: "fullName, email, and password are required" });
    }
    const result = await registerAdmin({ fullName, email, password });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    const result = await loginUser({ email, password });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "currentPassword and newPassword are required" });
    }
    const result = await changePassword(req.user._id, {
      currentPassword,
      newPassword,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.status(200).json({ user: req.user });
};

module.exports = { register, login, updatePassword, getMe };
