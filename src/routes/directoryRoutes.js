const express = require("express");
const requireAuth = require("../middleware/auth");
const { listInstitutions, listFaculty, listStudents } = require("../controllers/directoryController");

const router = express.Router();

// Public: the register form needs to show a list of institutions to a
// faculty applicant BEFORE they have an account, so this can't require auth.
router.get("/institutions", listInstitutions);

// These are only useful once logged in (assigning faculty, building a team).
router.get("/faculty", requireAuth, listFaculty);
router.get("/students", requireAuth, listStudents);

module.exports = router;
