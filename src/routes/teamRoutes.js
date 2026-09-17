const express = require("express");
const requireAuth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");
const { createTeam, addStudent, getTeam } = require("../controllers/teamController");

const router = express.Router();
router.use(requireAuth);

router.post("/", allowRoles("faculty"), createTeam);
router.patch("/:id/add-student", allowRoles("faculty"), addStudent);
router.get("/:id", getTeam);

module.exports = router;
