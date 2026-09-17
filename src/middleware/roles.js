// Use after requireAuth: allowRoles("admin", "faculty") etc.
// Keeps "who can do this" declarative and visible at the top of each route,
// instead of buried inside controller logic.
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `This action requires one of: ${roles.join(", ")}` });
    }
    next();
  };
}

module.exports = allowRoles;
