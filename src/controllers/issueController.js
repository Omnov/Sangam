const asyncHandler = require("../utils/asyncHandler");
const Issue = require("../models/Issue");
const InstitutionProfile = require("../models/InstitutionProfile");
const FacultyProfile = require("../models/FacultyProfile");
const StudentProfile = require("../models/StudentProfile");
const Team = require("../models/Team");

async function moveStatus(issue, status, userId, note) {
  issue.status = status;
  issue.statusHistory.push({ status, changedBy: userId, note });
  await issue.save();
  return issue;
}

/* POST /api/issues  — anyone logged in can raise a problem */
const createIssue = asyncHandler(async (req, res) => {
  const { title, description, district, sector, theme } = req.body;
  if (!title || !description || !district || !sector) {
    return res.status(400).json({ message: "title, description, district and sector are required" });
  }
  const issue = await Issue.create({
    title, description, district, sector, theme, submittedBy: req.user._id,
    statusHistory: [{ status: "pending_review", changedBy: req.user._id, note: "Submitted" }],
  });
  res.status(201).json({ issue });
});

/*
  GET /api/issues?status=&district=&sector=  — list + filter

  Visibility rules: citizens and admins see everything (citizens raise
  issues and should be able to follow any of them; admins need full
  oversight to review submissions). Every other role only sees issues
  they're already engaged with, or - for institutions - ones they COULD
  engage with:
    - institution: issues open to engage (status "approved"), plus every
      issue this institution has already engaged with, at any later stage
    - faculty: only issues assigned to them
    - student: only issues whose team they're a member of
    - funding_org: only issues that have a funding request attached
      (i.e. something to potentially fund, or something they may have
      already pledged to)
*/
/*
  GET /api/issues?status=&district=&sector=  — list + filter
*/
const listIssues = asyncHandler(async (req, res) => {
  const { status, district, sector } = req.query;
  const conditions = [];
  if (status) conditions.push({ status });
  if (district) conditions.push({ district });
  if (sector) conditions.push({ sector });

  // Safe check for guest traffic
  const user = req.user;
  const role = user ? user.role : "guest";

  if (role === "guest") {
    conditions.push({ status: { $ne: "rejected" } });
  }

  else if (role === "institution") {
    const institution = await InstitutionProfile.findOne({ user: user._id });
    conditions.push({
      $or: [
        { status: "approved" },
        { engagedInstitution: institution?._id },
      ],
    });
  } else if (role === "faculty") {
    const faculty = await FacultyProfile.findOne({ user: user._id });
    conditions.push({ assignedFaculty: faculty?._id });
  } else if (role === "student") {
    const student = await StudentProfile.findOne({ user: user._id });
    const teams = student ? await Team.find({ students: student._id }).select("issue") : [];
    conditions.push({ _id: { $in: teams.map((t) => t.issue) } });
  } else if (role === "funding_org") {
    conditions.push({ fundingRequest: { $ne: null } });
  }
  // citizen / admin: no extra restriction - full visibility.

  const filter = conditions.length ? { $and: conditions } : {};
  const issues = await Issue.find(filter).sort({ createdAt: -1 }).limit(200).populate("updates.postedBy", "name");
  res.json({ issues });
});

/* GET /api/issues/:id */
const getIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id)
    .populate("submittedBy", "name email")
    .populate("engagedInstitution")
    .populate("assignedFaculty")
    .populate("team")
    .populate("fundingRequest")
    .populate("updates.postedBy", "name");
  if (!issue) return res.status(404).json({ message: "Issue not found" });
  res.json({ issue });
});

/* PATCH /api/issues/:id/approve — admin only */
const approveIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: "Issue not found" });
  if (issue.status !== "pending_review") {
    return res.status(400).json({ message: `Cannot approve an issue in status '${issue.status}'` });
  }
  issue.reviewedBy = req.user._id;
  issue.reviewNote = req.body.note;
  await moveStatus(issue, "approved", req.user._id, req.body.note);
  res.json({ issue });
});

/* PATCH /api/issues/:id/reject — admin only */
const rejectIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: "Issue not found" });
  if (issue.status !== "pending_review") {
    return res.status(400).json({ message: `Cannot reject an issue in status '${issue.status}'` });
  }
  issue.reviewedBy = req.user._id;
  issue.reviewNote = req.body.note;
  await moveStatus(issue, "rejected", req.user._id, req.body.note);
  res.json({ issue });
});

/* PATCH /api/issues/:id/engage — institution chooses to engage with an approved issue */
const engageIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: "Issue not found" });
  if (issue.status !== "approved") {
    return res.status(400).json({ message: "Only approved issues can be engaged" });
  }
  const institution = await InstitutionProfile.findOne({ user: req.user._id });
  if (!institution) return res.status(400).json({ message: "No institution profile found for this account" });

  issue.engagedInstitution = institution._id;
  await moveStatus(issue, "engaged", req.user._id, "Institution engaged");
  res.json({ issue });
});

/* PATCH /api/issues/:id/assign-faculty  { facultyId } — institution assigns a faculty member */
const assignFaculty = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: "Issue not found" });
  if (issue.status !== "engaged") {
    return res.status(400).json({ message: "Faculty can only be assigned to an engaged issue" });
  }
  const institution = await InstitutionProfile.findOne({ user: req.user._id });
  if (!institution || String(issue.engagedInstitution) !== String(institution._id)) {
    return res.status(403).json({ message: "Only the engaged institution can assign faculty" });
  }

  const { facultyId } = req.body;
  const faculty = await FacultyProfile.findById(facultyId);
  if (!faculty) return res.status(404).json({ message: "Faculty profile not found" });
  if (String(faculty.institution) !== String(institution._id)) {
    return res.status(403).json({ message: "You can only appoint faculty who belong to your own institution" });
  }

  issue.assignedFaculty = faculty._id;
  await moveStatus(issue, "assigned", req.user._id, "Faculty assigned");
  res.json({ issue });
});

/* PATCH /api/issues/:id/start — faculty skips funding and starts solving directly */
const startWithoutFunding = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: "Issue not found" });
  if (issue.status !== "team_formed") {
    return res.status(400).json({ message: "Can only skip funding right after a team is formed" });
  }
  const faculty = await FacultyProfile.findOne({ user: req.user._id });
  if (!faculty || String(issue.assignedFaculty) !== String(faculty._id)) {
    return res.status(403).json({ message: "Only the assigned faculty can do this" });
  }
  await moveStatus(issue, "in_progress", req.user._id, "Started without requesting funding");
  res.json({ issue });
});

// Statuses from which the assigned faculty is allowed to post progress
// updates or mark the issue solved - basically "any time after assignment,
// until it's already solved or rejected".
const ACTIVE_FOR_FACULTY = ["assigned", "team_formed", "seeking_funds", "funded", "in_progress"];

/* POST /api/issues/:id/updates  { text } — assigned faculty posts a progress note */
const postUpdate = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ message: "Update text is required" });

  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: "Issue not found" });
  if (!ACTIVE_FOR_FACULTY.includes(issue.status)) {
    return res.status(400).json({ message: "Updates can only be posted while the project is active" });
  }
  const faculty = await FacultyProfile.findOne({ user: req.user._id });
  if (!faculty || String(issue.assignedFaculty) !== String(faculty._id)) {
    return res.status(403).json({ message: "Only the assigned faculty can post updates on this issue" });
  }

  issue.updates.push({ text: text.trim(), postedBy: req.user._id });
  await issue.save();
  await issue.populate("updates.postedBy", "name");
  res.status(201).json({ issue });
});

/* PATCH /api/issues/:id/complete — citizen, institution, faculty, or admin can mark complete */
const markComplete = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: "Issue not found" });

  // Disallow completing already finalized or rejected issues
  if (["solved", "rejected"].includes(issue.status)) {
    return res.status(400).json({ message: `This issue is already marked as ${issue.status}` });
  }

  const userId = String(req.user._id);
  const role = req.user.role;
  let isAuthorized = false;

  // 1. Citizen who raised the issue
  if (String(issue.submittedBy) === userId) {
    isAuthorized = true;
  }

  // 2. Institution that engaged with the issue
  if (!isAuthorized && role === "institution") {
    const inst = await InstitutionProfile.findOne({ user: req.user._id });
    if (inst && String(issue.engagedInstitution) === String(inst._id)) {
      isAuthorized = true;
    }
  }

  // 3. Assigned faculty member
  if (!isAuthorized && role === "faculty") {
    const faculty = await FacultyProfile.findOne({ user: req.user._id });
    if (faculty && String(issue.assignedFaculty) === String(faculty._id)) {
      isAuthorized = true;
    }
  }

  // 4. Admin override
  if (role === "admin") {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return res.status(403).json({ message: "You do not have permission to close this challenge" });
  }

  await moveStatus(issue, "solved", req.user._id, req.body.note || "Marked complete");
  res.json({ issue });
});

module.exports = {
  createIssue, listIssues, getIssue, approveIssue, rejectIssue, engageIssue, assignFaculty,
  startWithoutFunding, postUpdate, markComplete, moveStatus,
};
