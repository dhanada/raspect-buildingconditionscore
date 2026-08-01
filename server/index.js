/**
 * RaSpect Inspectica™ BuildingConditionScore API — entry point
 *
 * Real-data backend: Nominatim geocoding + OpenStreetMap (Overpass) building
 * data + Open-Meteo climate, with SQLite persistence for leads, messages and
 * analyses. CORS-enabled for the static frontend.
 */
require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const { openDb } = require("./db");
const scoreRoutes = require("./routes/score");
const leadRoutes = require("./routes/leads");
const messageRoutes = require("./routes/messages");

const PORT = process.env.PORT || 4000;
const DB_PATH = path.resolve(__dirname, process.env.SQLITE_PATH || "./data/raspect.db");

const app = express();
app.use(express.json({ limit: "1mb" }));

// CORS — allow the configured frontend origin(s).
// Defaults cover local dev + the GitHub Pages deployment; override via CORS_ORIGINS.
const origins = (process.env.CORS_ORIGINS || "http://localhost:8099,http://localhost:5500,https://dhanada.github.io")
  .split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins, methods: ["GET", "POST", "PATCH", "DELETE"], credentials: false }));

// Open the database
const db = openDb(DB_PATH);

// ---- Health check ----
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "raspect-buildingconditionscore-api", time: new Date().toISOString() });
});

// ---- Routes ----
app.use("/api/score", scoreRoutes(db));
app.use("/api/leads", leadRoutes(db));
app.use("/api/messages", messageRoutes(db));

// 404 for anything else
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler
app.use((err, req, res, next) => {
  console.error("[API]", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`✅ RaSpect Inspectica API listening on http://localhost:${PORT}`);
  console.log(`   CORS origins: ${origins.join(", ")}`);
  console.log(`   SQLite: ${DB_PATH}`);
});
