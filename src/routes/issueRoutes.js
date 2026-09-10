const express = require("express");
const requireAuth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");
const {
  createIssue, listIssues, getIssue, approveIssue, rejectIssue, engageIssue, assignFaculty,
  startWithoutFunding, postUpdate, markComplete,
} = require("../controllers/issueController");

const router = express.Router();

// Optional auth helper: attaches user if token exists, but allows guest traffic through
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }
  return requireAuth(req, res, (err) => {
    if (err) req.user = null;
    next();
  });
};

// PUBLIC / GUEST ACCESSIBLE ROUTES
router.get("/", optionalAuth, listIssues);
router.get("/:id", optionalAuth, getIssue);

// PROTECTED ROUTES (Login strictly required)
router.post("/", requireAuth, allowRoles("citizen"), createIssue);
router.patch("/:id/approve", requireAuth, allowRoles("admin"), approveIssue);
router.patch("/:id/reject", requireAuth, allowRoles("admin"), rejectIssue);
router.patch("/:id/engage", requireAuth, allowRoles("institution"), engageIssue);
router.patch("/:id/assign-faculty", requireAuth, allowRoles("institution"), assignFaculty);
router.patch("/:id/start", requireAuth, allowRoles("faculty"), startWithoutFunding);
router.post("/:id/updates", requireAuth, allowRoles("faculty"), postUpdate);
router.patch("/:id/complete", requireAuth, allowRoles("faculty"), markComplete);
router.patch("/:id/complete",requireAuth,allowRoles("citizen", "institution", "faculty", "admin"),markComplete);

module.exports = router;