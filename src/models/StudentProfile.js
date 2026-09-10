const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    // A student's "college" IS an institution - the same entities that
    // engage with challenges and employ faculty. One shared list, not two.
    college: { type: mongoose.Schema.Types.ObjectId, ref: "InstitutionProfile", required: true },
    branch: { type: String, required: true },
    yearOfStudy: { type: Number },
    skills: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentProfile", studentProfileSchema);
