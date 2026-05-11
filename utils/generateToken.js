const jwt = require("jsonwebtoken");

/**
 * Generate a JWT token for a user
 * @param {string} userId - MongoDB user ID
 * @param {boolean} isAdmin - Whether the user is admin
 * @returns {string} JWT token
 */
const generateToken = (userId, isAdmin) => {
  return jwt.sign({ id: userId, isAdmin }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

module.exports = generateToken;
