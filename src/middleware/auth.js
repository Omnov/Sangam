const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the Bearer token on the request and attaches the user to req.user.
// Any route behind this middleware can assume req.user exists and is active.
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing or malformed Authorization header" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return res.status(401).json({ message: "Invalid session" });

    req.user = user; // { _id, email, role, name, ... }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = requireAuth;
