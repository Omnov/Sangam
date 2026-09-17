const asyncHandler = require("../utils/asyncHandler");
const Issue = require("../models/Issue");
const FundingRequest = require("../models/FundingRequest");
const FacultyProfile = require("../models/FacultyProfile");
const FundingOrgProfile = require("../models/FundingOrgProfile");
const { moveStatus } = require("./issueController");

/* POST /api/funding-requests  { issueId, amountNeeded } — assigned faculty raises a fund request */
const createFundingRequest = asyncHandler(async (req, res) => {
  const { issueId, amountNeeded } = req.body;
  if (!amountNeeded || amountNeeded <= 0) {
    return res.status(400).json({ message: "amountNeeded must be a positive number" });
  }

  const issue = await Issue.findById(issueId);
  if (!issue) return res.status(404).json({ message: "Issue not found" });
  if (!["team_formed", "in_progress"].includes(issue.status)) {
    return res.status(400).json({ message: "Funding can only be requested once a team is formed" });
  }

  const faculty = await FacultyProfile.findOne({ user: req.user._id });
  if (!faculty || String(issue.assignedFaculty) !== String(faculty._id)) {
    return res.status(403).json({ message: "Only the assigned faculty can raise a funding request for this issue" });
  }

  const fundingRequest = await FundingRequest.create({ issue: issue._id, requestedBy: faculty._id, amountNeeded });
  issue.fundingRequest = fundingRequest._id;
  await moveStatus(issue, "seeking_funds", req.user._id, `Funding requested: ${amountNeeded}`);

  res.status(201).json({ fundingRequest });
});

/* GET /api/funding-requests?status=open — funding orgs browse what's open */
const listFundingRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const requests = await FundingRequest.find(filter).populate("issue", "title district sector").sort({ createdAt: -1 });
  res.json({ fundingRequests: requests });
});

/* POST /api/funding-requests/:id/pledge  { amount, note } — a funding org chooses to fund */
const pledge = asyncHandler(async (req, res) => {
  const { amount, note } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ message: "amount must be a positive number" });

  const fundingRequest = await FundingRequest.findById(req.params.id);
  if (!fundingRequest) return res.status(404).json({ message: "Funding request not found" });
  if (fundingRequest.status === "funded" || fundingRequest.status === "closed") {
    return res.status(400).json({ message: `This request is already ${fundingRequest.status}` });
  }

  const org = await FundingOrgProfile.findOne({ user: req.user._id });
  if (!org) return res.status(400).json({ message: "No funding organisation profile found for this account" });

  fundingRequest.pledges.push({ org: org._id, amount, note });
  fundingRequest.amountRaised += amount;
  fundingRequest.status = fundingRequest.amountRaised >= fundingRequest.amountNeeded ? "funded" : "partially_funded";
  await fundingRequest.save();

  org.totalPledged += amount;
  await org.save();

  if (fundingRequest.status === "funded") {
    const issue = await Issue.findById(fundingRequest.issue);
    if (issue) await moveStatus(issue, "funded", req.user._id, "Funding goal reached");
  }

  res.json({ fundingRequest });
});

module.exports = { createFundingRequest, listFundingRequests, pledge };
