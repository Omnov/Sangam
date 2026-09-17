/*
  USER — the only collection that holds login credentials.
  Keeping auth separate from profile data means the password hash never
  travels around with the rest of a person's (larger, more-often-read)
  profile document, and it's the one place we have to be paranoid about.
*/
const mongoose = require("mongoose");

const ROLES = ["citizen", "student", "faculty", "institution", "funding_org", "admin"];

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false }, // never returned by default
    role: { type: String, enum: ROLES, required: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;
