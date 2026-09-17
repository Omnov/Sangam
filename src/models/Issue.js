/*
  ISSUE — the core "problem" document, from raw citizen submission all
  the way through to a completed solution.

  `status` drives the whole lifecycle:
    pending_review -> (rejected | approved) -> engaged -> assigned
    -> team_formed -> [faculty now chooses one of two paths:]
         - funding needed:    seeking_funds -> funded
         - funding not needed: in_progress
    -> solved   (faculty marks this directly, from team_formed / seeking_funds / funded / in_progress)

  We keep this in ONE collection (not split across physical databases)
  and instead index on `status`, `district`, and `sector`. In MongoDB,
  querying an indexed field is what "segmenting by state" is for —
  splitting into separate physical databases would only add
  cross-database query pain without a real performance win at this scale.
*/
const mongoose = require("mongoose");

const STATUSES = [
  "pending_review", "rejected", "approved", "engaged", "assigned",
  "team_formed",     // team is formed; faculty now chooses funding or not
  "seeking_funds", "funded",  // <- only reached if faculty chooses to raise funds
  "in_progress",      // <- reached directly from team_formed if funding is skipped
  "solved",            // <- faculty marks this whenever the work is done
];

const issueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    district: { type: String, required: true },
    sector: { type: String, required: true },
    theme: { type: String },

    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    status: { type: String, enum: STATUSES, default: "pending_review" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin who approved/rejected
    reviewNote: { type: String },

    engagedInstitution: { type: mongoose.Schema.Types.ObjectId, ref: "InstitutionProfile" },
    assignedFaculty: { type: mongoose.Schema.Types.ObjectId, ref: "FacultyProfile" },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    fundingRequest: { type: mongoose.Schema.Types.ObjectId, ref: "FundingRequest" },

    // Progress notes the assigned faculty posts over time - "what's going on".
    // Kept embedded on the issue (not a separate collection) since updates
    // are always read/written in the context of a single issue.
    updates: [
      {
        text: { type: String, required: true },
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        at: { type: Date, default: Date.now },
      },
    ],

    // audit trail: every status change gets an entry, cheap and invaluable later
    statusHistory: [
      {
        status: { type: String, enum: STATUSES },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

issueSchema.index({ status: 1, district: 1, sector: 1 });

module.exports = mongoose.model("Issue", issueSchema);
module.exports.STATUSES = STATUSES;
