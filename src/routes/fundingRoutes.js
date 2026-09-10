const express = require("express");
const requireAuth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");
const { createFundingRequest, listFundingRequests, pledge } = require("../controllers/fundingController");

const router = express.Router();
router.use(requireAuth);

router.post("/", allowRoles("faculty"), createFundingRequest);
router.get("/", listFundingRequests);
router.post("/:id/pledge", allowRoles("funding_org"), pledge);

module.exports = router;
