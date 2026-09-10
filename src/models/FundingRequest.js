const mongoose = require("mongoose");

const fundingRequestSchema = new mongoose.Schema(
  {
    issue: { type: mongoose.Schema.Types.ObjectId, ref: "Issue", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "FacultyProfile", required: true },
    amountNeeded: { type: Number, required: true },
    amountRaised: { type: Number, default: 0 },
    status: { type: String, enum: ["open", "partially_funded", "funded", "closed"], default: "open" },
    pledges: [
      {
        org: { type: mongoose.Schema.Types.ObjectId, ref: "FundingOrgProfile", required: true },
        amount: { type: Number, required: true },
        note: String,
        pledgedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

fundingRequestSchema.index({ status: 1 });

module.exports = mongoose.model("FundingRequest", fundingRequestSchema);
