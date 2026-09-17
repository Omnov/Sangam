const mongoose = require("mongoose");

const facultyProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "InstitutionProfile", required: true },
    department: { type: String },
    expertise: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("FacultyProfile", facultyProfileSchema);
