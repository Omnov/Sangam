require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./src/config/db");

let Issue;
try {
  Issue = require("./src/models/Issue");
} catch {
  Issue = require("./src/models/issueModel");
}

let User;
try {
  User = require("./src/models/User");
} catch {
  User = require("./src/models/userModel");
}

async function runSeed() {
  try {
    await connectDB();
    console.log("Connected to MongoDB Atlas.");

    // Provide passwordHash to satisfy the User schema
    let dummyUser = await User.findOne({ email: "citizen.demo@sangam.gov.in" });
    if (!dummyUser) {
      dummyUser = await User.create({
        name: "Pranjal Soren",
        email: "citizen.demo@sangam.gov.in",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwx1234567890abcdefghijklmnopqrst",
        role: "citizen",
        district: "Ranchi"
      });
    }

    const userId = dummyUser._id;

    const sampleIssues = [
      {
        title: "Clean Drinking Water Monitoring System",
        description: "Deploying low-cost IoT sensors to detect mineral runoff and contamination in local tube wells.",
        sector: "Water & Sanitation",
        district: "Ranchi",
        submittedBy: userId,
        status: "approved",
        upvotes: 24,
        createdAt: new Date()
      },
      {
        title: "Solar Cold Storage for Mahua & Forest Produce",
        description: "Decentralized solar cold chain storage to prevent spoilage of seasonal forest harvests for local farmers.",
        sector: "Agriculture",
        district: "Khunti",
        submittedBy: userId,
        status: "approved",
        upvotes: 38,
        createdAt: new Date()
      },
      {
        title: "Pothole & Monsoon Road Cave-in Crowdsourcing Tool",
        description: "Mobile image-reporting tool for road washouts that forwards geo-tagged photos to the municipal desk.",
        sector: "Infrastructure",
        district: "East Singhbhum",
        submittedBy: userId,
        status: "approved",
        upvotes: 19,
        createdAt: new Date()
      },
      {
        title: "AI Maternal Healthcare Tele-Consultation",
        description: "Multilingual triage assistant for Anganwadi workers operating in remote rural primary health centers.",
        sector: "Healthcare",
        district: "Dhanbad",
        submittedBy: userId,
        status: "approved",
        upvotes: 31,
        createdAt: new Date()
      }
    ];

    await Issue.deleteMany({});
    await Issue.insertMany(sampleIssues);

    console.log("Successfully seeded 4 issues linked to a real citizen user!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

runSeed();