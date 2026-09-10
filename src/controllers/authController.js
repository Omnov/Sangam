const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const FacultyProfile = require("../models/FacultyProfile");
const InstitutionProfile = require("../models/InstitutionProfile");
const FundingOrgProfile = require("../models/FundingOrgProfile");

const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function publicUser(user) {
  return { id: user._id, email: user.email, name: user.name, role: user.role };
}

// Loads the role-specific profile document for a user, if that role has one.
// Returned alongside the user on register/login so the frontend always has
// direct access to "my own profile id" (needed e.g. to filter faculty by
// institution) without a second round trip.
async function loadProfile(user) {
  if (user.role === "student") return StudentProfile.findOne({ user: user._id }).populate("college", "institutionName");
  if (user.role === "faculty") return FacultyProfile.findOne({ user: user._id }).populate("institution", "institutionName");
  if (user.role === "institution") return InstitutionProfile.findOne({ user: user._id });
  if (user.role === "funding_org") return FundingOrgProfile.findOne({ user: user._id });
  return null; // citizen / admin have no separate profile document
}

/*
  POST /api/auth/register
  Body always has: email, password, name, role, profile: {...role-specific fields}
  "citizen" and "admin" have no extra profile collection.
*/
const register = asyncHandler(async (req, res) => {
  const { email, password, name, role, profile = {} } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ message: "email, password, name and role are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ message: "An account with this email already exists" });

  // Validate role-specific required fields BEFORE creating the User,
  // so we never end up with an orphaned account and no profile.
  let institutionDoc = null;
  let collegeDoc = null;
  if (role === "student") {
    if (!profile.college || !profile.branch) {
      return res.status(400).json({ message: "Student registration requires selecting a college and a branch" });
    }
    collegeDoc = await InstitutionProfile.findById(profile.college);
    if (!collegeDoc) return res.status(400).json({ message: "Selected college does not exist" });
  }
  if (role === "institution" && (!profile.institutionName || !profile.fieldsOfExpertise?.length)) {
    return res.status(400).json({ message: "Institution registration requires institutionName and fieldsOfExpertise" });
  }
  if (role === "funding_org" && !profile.orgName) {
    return res.status(400).json({ message: "Funding org registration requires orgName" });
  }
  if (role === "faculty") {
    if (!profile.institution) {
      return res.status(400).json({ message: "Faculty registration requires selecting an institution" });
    }
    institutionDoc = await InstitutionProfile.findById(profile.institution);
    if (!institutionDoc) {
      return res.status(400).json({ message: "Selected institution does not exist" });
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ email: email.toLowerCase(), passwordHash, name, role });

  let profileDoc = null;
  try {
    if (role === "student") {
      profileDoc = await StudentProfile.create({
        user: user._id, college: collegeDoc._id, branch: profile.branch,
        yearOfStudy: profile.yearOfStudy, skills: profile.skills || [],
      });
    } else if (role === "faculty") {
      profileDoc = await FacultyProfile.create({
        user: user._id, institution: institutionDoc._id,
        department: profile.department, expertise: profile.expertise || [],
      });
    } else if (role === "institution") {
      profileDoc = await InstitutionProfile.create({
        user: user._id, institutionName: profile.institutionName,
        fieldsOfExpertise: profile.fieldsOfExpertise, manpower: profile.manpower, address: profile.address,
      });
    } else if (role === "funding_org") {
      profileDoc = await FundingOrgProfile.create({
        user: user._id, orgName: profile.orgName, focusAreas: profile.focusAreas || [],
      });
    }
    // role === "citizen" / "admin": no extra profile document needed.
  } catch (err) {
    // Profile creation failed after the User was created - roll back manually
    // since a standalone MongoDB instance (no replica set) can't do multi-doc
    // transactions. Once you're on a replica set / Atlas, wrap this in a session.
    await User.findByIdAndDelete(user._id);
    throw err;
  }

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user), profile: profileDoc });
});

/*
  POST /api/auth/login
*/
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "email and password are required" });

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user || !user.isActive) return res.status(401).json({ message: "Invalid email or password" });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ message: "Invalid email or password" });

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user);
  const profile = await loadProfile(user);
  res.json({ token, user: publicUser(user), profile });
});

/*
  GET /api/auth/me   (requires auth)
*/
const me = asyncHandler(async (req, res) => {
  const profile = await loadProfile(req.user);
  res.json({ user: publicUser(req.user), profile });
});

module.exports = { register, login, me };
