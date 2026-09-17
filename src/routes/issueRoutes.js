const express = require("express");
const requireAuth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");
const {
  createIssue, listIssues, getIssue, approveIssue, rejectIssue, engageIssue, assignFaculty,
  startWithoutFunding, postUpdate, markComplete,
} = require("../controllers/issueController");

const router = express.Router();

// 1. PUBLIC ROUTE: Anyone (guest or logged-in) can view the open challenges
router.get("/", listIssues);

// 2. PROTECTED ROUTES: Everything below this requires an active login token
router.use(requireAuth);

router.post("/", allowRoles("citizen"), createIssue);   // ONLY citizens raise problems
router.get("/:id", getIssue);
router.patch("/:id/approve", allowRoles("admin"), approveIssue);
router.patch("/:id/reject", allowRoles("admin"), rejectIssue);
router.patch("/:id/engage", allowRoles("institution"), engageIssue);
router.patch("/:id/assign-faculty", allowRoles("institution"), assignFaculty);
router.patch("/:id/start", allowRoles("faculty"), startWithoutFunding);
router.post("/:id/updates", allowRoles("faculty"), postUpdate);
router.patch("/:id/complete", allowRoles("faculty"), markComplete);

module.exports = router;