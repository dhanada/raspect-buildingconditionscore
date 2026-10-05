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
const rateLimit = require("express-rate-limit");

const { openDb } = require("./db");
const scoreRoutes = require("./routes/score");
const leadRoutes = require("./routes/leads");
const messageRoutes = require("./routes/messages");

const PORT = process.env.PORT || 4000;
const DB_PATH = path.resolve(__dirname, process.env.SQLITE_PATH || "./data/raspect.db");

const app = express();

// We are (or will be) behind Railway/Render proxies — trust the first hop so
// express-rate-limit keys on the real client IP instead of the proxy's.
app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));

// CORS — allow the configured frontend origin(s).
// Defaults cover local dev + the GitHub Pages deployment; override via CORS_ORIGINS.
const origins = (process.env.CORS_ORIGINS || "http://localhost:8099,http://localhost:5500,https://dhanada.github.io")
  .split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins, methods: ["GET", "POST", "PATCH", "DELETE"], credentials: false }));

// Open the database
const db = openDb(DB_PATH);

// ---- Rate limiting ----
// /api/score fans out to public third-party APIs (Nominatim, Overpass,
// Open-Meteo) on every call — a tight limit protects those services and us
// from abuse. Lead/message endpoints get a generous shared limit.
const jsonRateLimit = (limit, windowMs = 60 * 1000) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ error: "Too many requests — please try again shortly." })
  });

app.use("/api/score", jsonRateLimit(parseInt(process.env.SCORE_RATE_LIMIT, 10) || 30));
app.use("/api/leads", jsonRateLimit(parseInt(process.env.LEAD_RATE_LIMIT, 10) || 60));
app.use("/api/messages", jsonRateLimit(parseInt(process.env.LEAD_RATE_LIMIT, 10) || 60));

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

// Central error handler.
// Respect the status set by libraries (body-parser → 400/413, etc.) instead of
// flattening every error to 500. Only 5xx errors are logged and masked; 4xx
// messages are safe to expose (validation/parse feedback).
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error("[API]", err);
  res.status(status).json({
    error: status < 500 ? (err.message || "Bad request") : "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`✅ RaSpect Inspectica API listening on http://localhost:${PORT}`);
  console.log(`   CORS origins: ${origins.join(", ")}`);
  console.log(`   SQLite: ${DB_PATH}`);
});
