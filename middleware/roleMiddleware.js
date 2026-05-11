/**
 * Admin only middleware
 * Must be used AFTER protect middleware
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admins only." });
  }
};

/**
 * Allow specific roles + admin
 * @param {...string} roles - allowed roles
 */
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (req.user && (req.user.isAdmin || roles.includes(req.user.role))) {
      next();
    } else {
      res
        .status(403)
        .json({
          message: `Access denied. Required roles: ${roles.join(", ")}`,
        });
    }
  };
};

module.exports = { adminOnly, allowRoles };
