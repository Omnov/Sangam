const asyncHandler = require("../utils/asyncHandler");
const Issue = require("../models/Issue");
const Team = require("../models/Team");
const FacultyProfile = require("../models/FacultyProfile");
const StudentProfile = require("../models/StudentProfile");
const { moveStatus } = require("./issueController");

/* POST /api/teams  { issueId, name, studentIds: [] } — faculty forms a team for their assigned issue */
const createTeam = asyncHandler(async (req, res) => {
  const { issueId, name, studentIds = [] } = req.body;
  const issue = await Issue.findById(issueId);
  if (!issue) return res.status(404).json({ message: "Issue not found" });
  if (issue.status !== "assigned") {
    return res.status(400).json({ message: "A team can only be formed once faculty is assigned" });
  }

  const faculty = await FacultyProfile.findOne({ user: req.user._id });
  if (!faculty || String(issue.assignedFaculty) !== String(faculty._id)) {
    return res.status(403).json({ message: "Only the assigned faculty can form the team" });
  }

  const students = await StudentProfile.find({ _id: { $in: studentIds } });
  if (students.length !== studentIds.length) {
    return res.status(400).json({ message: "One or more studentIds do not exist" });
  }
  const outsiders = students.filter((s) => String(s.college) !== String(faculty.institution));
  if (outsiders.length) {
    return res.status(400).json({ message: "All students must belong to your own institution" });
  }
  const uniqueIds = [...new Set(studentIds.map(String))]; // "any number of unique students"

  const team = await Team.create({ issue: issue._id, faculty: faculty._id, name, students: uniqueIds });
  issue.team = team._id;
  await moveStatus(issue, "team_formed", req.user._id, "Team formed");

  res.status(201).json({ team });
});

/* PATCH /api/teams/:id/add-student  { studentId } */
const addStudent = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) return res.status(404).json({ message: "Team not found" });

  const faculty = await FacultyProfile.findOne({ user: req.user._id });
  if (!faculty || String(team.faculty) !== String(faculty._id)) {
    return res.status(403).json({ message: "Only the team's faculty can add students" });
  }

  const { studentId } = req.body;
  const student = await StudentProfile.findById(studentId);
  if (!student) return res.status(404).json({ message: "Student profile not found" });
  if (String(student.college) !== String(faculty.institution)) {
    return res.status(400).json({ message: "This student does not belong to your institution" });
  }

  if (!team.students.map(String).includes(String(studentId))) {
    team.students.push(studentId);
    await team.save();
  }
  res.json({ team });
});

/* GET /api/teams/:id */
const getTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id).populate("students").populate("faculty").populate("issue");
  if (!team) return res.status(404).json({ message: "Team not found" });
  res.json({ team });
});

module.exports = { createTeam, addStudent, getTeam };
