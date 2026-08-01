/**
 * Score routes — real-data building condition analysis.
 */
const express = require("express");
const router = express.Router();

const { geocode } = require("../services/geocoder");
const { queryBuilding } = require("../services/osm");
const { getClimate } = require("../services/climate");
const { tileFor } = require("../services/imagery");
const { computeScore } = require("../scoring");
const { uid } = require("../db");

module.exports = function scoreRoutes(db) {
  /**
   * POST /api/score  { address }
   * Resolves the address, pulls real building + climate data, computes the
   * BuildingConditionScore, stores the analysis, and returns the payload.
   */
  router.post("/", async (req, res) => {
    const address = (req.body && req.body.address ? String(req.body.address) : "").trim();
    if (!address) return res.status(400).json({ error: "Address is required" });

    try {
      const geo = await geocode(address);

      const [building, climate] = await Promise.all([
        queryBuilding(geo.lat, geo.lon),
        getClimate(geo.lat, geo.lon)
      ]);

      const score = computeScore({ building: building || {}, climate, geocode: geo });

      const analysis = {
        id: uid("ana"),
        address,
        resolvedAddress: geo.displayName,
        coordinates: { lat: round6(geo.lat), lon: round6(geo.lon) },
        mapTile: tileFor(geo.lat, geo.lon, 18),
        building: building || null,
        score,
        generatedAt: new Date().toISOString()
      };

      // Persist for history + repeat-lookup
      const stmt = db.prepare(
        `INSERT INTO analyses (id, address, lat, lon, building, score, financial, kris, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      stmt.run(
        analysis.id, address, geo.lat, geo.lon,
        JSON.stringify(building || {}),
        JSON.stringify(score),
        JSON.stringify(score.financial),
        JSON.stringify(score.kris),
        analysis.generatedAt
      );

      res.json(analysis);
    } catch (err) {
      const status = err.code === "NOT_FOUND" ? 404 : 502;
      res.status(status).json({ error: err.message });
    }
  });

  /**
   * GET /api/score/:id — retrieve a previously generated analysis.
   */
  router.get("/:id", (req, res) => {
    const row = db.prepare("SELECT * FROM analyses WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Analysis not found" });
    res.json({
      id: row.id,
      address: row.address,
      coordinates: { lat: row.lat, lon: row.lon },
      building: JSON.parse(row.building || "null"),
      score: JSON.parse(row.score),
      generatedAt: row.created_at
    });
  });

  return router;
};

function round6(v) { return Math.round(v * 1e6) / 1e6; }
