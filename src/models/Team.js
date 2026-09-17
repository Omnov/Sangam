const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    issue: { type: mongoose.Schema.Types.ObjectId, ref: "Issue", required: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "FacultyProfile", required: true },
    name: { type: String, required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "StudentProfile" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", teamSchema);
