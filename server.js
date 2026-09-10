require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/authRoutes");
const issueRoutes = require("./src/routes/issueRoutes");
const teamRoutes = require("./src/routes/teamRoutes");
const fundingRoutes = require("./src/routes/fundingRoutes");
const directoryRoutes = require("./src/routes/directoryRoutes");

const app = express();

// Added so the new React frontend (served from its own Vite origin/port)
// can call this API directly in production. Does not change any existing
// route, request/response shape, or the static site still served below.
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public"))); // serves index.html/style.css/app.js on THIS SAME port

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/funding-requests", fundingRoutes);
app.use("/api", directoryRoutes); // -> /api/institutions, /api/faculty, /api/students

app.use("/api", (req, res) => res.status(404).json({ message: "Not found" }));

app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: "Duplicate value", key: err.keyValue });
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Sangam running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
