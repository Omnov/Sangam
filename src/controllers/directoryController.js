/*
  Read-only "who can I pick from a dropdown" endpoints. These exist purely
  to make the frontend usable — e.g. an institution needs to see a list of
  faculty (with names, not raw ObjectIds) to assign one to an issue, and
  a faculty member needs to see students to build a team.

  Kept open to any authenticated user for this MVP. If you want to lock
  these down later (e.g. only institutions can list faculty), add
  allowRoles(...) in directoryRoutes.js the same way the other routes do.
*/
const asyncHandler = require("../utils/asyncHandler");
const InstitutionProfile = require("../models/InstitutionProfile");
const FacultyProfile = require("../models/FacultyProfile");
const StudentProfile = require("../models/StudentProfile");

const listInstitutions = asyncHandler(async (req, res) => {
  const institutions = await InstitutionProfile.find().populate("user", "name email");
  res.json({
    institutions: institutions.map((i) => ({
      id: i._id,
      name: i.institutionName,
      fieldsOfExpertise: i.fieldsOfExpertise,
      manpower: i.manpower,
    })),
  });
});

const listFaculty = asyncHandler(async (req, res) => {
  // Optional ?institution=<InstitutionProfile id> - an institution's own
  // dashboard uses this so its "assign faculty" dropdown only shows its
  // own faculty, not everyone else's.
  const filter = req.query.institution ? { institution: req.query.institution } : {};
  const faculty = await FacultyProfile.find(filter).populate("user", "name email").populate("institution", "institutionName");
  res.json({
    faculty: faculty.map((f) => ({
      id: f._id,
      name: f.user?.name,
      email: f.user?.email,
      department: f.department,
      institution: f.institution?.institutionName,
    })),
  });
});

const listStudents = asyncHandler(async (req, res) => {
  // Optional ?college=<InstitutionProfile id> - a faculty member's own
  // dashboard uses this so its "add student to team" list only shows
  // students that actually belong to their institution.
  const filter = req.query.college ? { college: req.query.college } : {};
  const students = await StudentProfile.find(filter).populate("user", "name email").populate("college", "institutionName");
  res.json({
    students: students.map((s) => ({
      id: s._id,
      name: s.user?.name,
      email: s.user?.email,
      college: s.college?.institutionName,
      branch: s.branch,
    })),
  });
});

module.exports = { listInstitutions, listFaculty, listStudents };
