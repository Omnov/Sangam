const mongoose = require("mongoose");

const institutionProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    institutionName: { type: String, required: true },
    fieldsOfExpertise: [{ type: String, required: true }],
    manpower: { type: Number }, // approx headcount available for projects
    address: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InstitutionProfile", institutionProfileSchema);
