const mongoose = require("mongoose");

const fundingOrgProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    orgName: { type: String, required: true },
    focusAreas: [{ type: String }],
    totalPledged: { type: Number, default: 0 }, // running total, updated when a pledge is made
  },
  { timestamps: true }
);

module.exports = mongoose.model("FundingOrgProfile", fundingOrgProfileSchema);
