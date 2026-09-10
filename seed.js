require('dotenv').config();
const mongoose = require('mongoose');

// Replace or align with your Challenge model schema
const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'General' },
  raisedBy: { type: String, required: true },
  raisedByType: { type: String, enum: ['Citizen', 'Institution'], default: 'Citizen' },
  district: { type: String, default: 'Ranchi' },
  status: { type: String, default: 'open' },
  createdAt: { type: Date, default: Date.now }
});

const Challenge = mongoose.models.Challenge || mongoose.model('Challenge', challengeSchema);

const sampleChallenges = [
  {
    title: "Clean Drinking Water Monitoring System",
    description: "Deploying low-cost IoT sensors to detect mineral runoff and contamination in local tube wells.",
    category: "Water & Sanitation",
    raisedBy: "BIT Mesra Research Cell",
    raisedByType: "Institution",
    district: "Ranchi",
    status: "open"
  },
  {
    title: "Solar Cold Storage for Mahua & Forest Produce",
    description: "Tribal farmers require small-scale decentralized cold chain storage to prevent spoilage of seasonal forest harvests.",
    category: "Agriculture & Rural Tech",
    raisedBy: "Ramesh Soren (Farmer Collective)",
    raisedByType: "Citizen",
    district: "Khunti",
    status: "open"
  },
  {
    title: "Pothole & Road Hazard Crowdsourcing App",
    description: "A mobile-first image recognition tool for reporting monsoon road cave-ins directly to the Municipal Corporation.",
    category: "Urban Infrastructure",
    raisedBy: "Jamshedpur Citizen Forum",
    raisedByType: "Citizen",
    district: "East Singhbhum",
    status: "open"
  },
  {
    title: "AI-Assisted Maternal Healthcare Tele-Consultation",
    description: "Automated multilingual triage assistance for Anganwadi workers in remote rural primary health centers.",
    category: "Healthcare",
    raisedBy: "RIMS Community Health Dept",
    raisedByType: "Institution",
    district: "Dhanbad",
    status: "open"
  }
];

async function seedDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI not found in your environment or .env file.");
    }
    await mongoose.connect(uri);
    console.log("Connected to MongoDB Atlas.");

    // Clear existing empty or test records and insert sample data
    await Challenge.deleteMany({});
    await Challenge.insertMany(sampleChallenges);

    console.log("Successfully seeded 4 sample challenges!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seedDB();