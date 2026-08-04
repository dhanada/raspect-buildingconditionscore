/**
 * Score routes — real-data building condition analysis.
 */
const express = require("express");
const router = express.Router();

const { geocode } = require("../services/geocoder");
const { queryBuilding, queryBuildingById, queryBuildingByNominatim } = require("../services/osm");
const { getClimate } = require("../services/climate");
const { tileFor, findBuildingImages } = require("../services/imagery");
const { findUserReviews } = require("../services/reviews");
const { computeScore } = require("../scoring");
const { uid } = require("../db");

module.exports = function scoreRoutes(db) {
  /**
   * POST /api/score  { address }
   * Resolves the address, pulls real building + climate data, finds real
   * building photos (Wikimedia Commons) and user-reported defects
   * (Google Places, optional key), computes the BuildingConditionScore,
   * stores the analysis, and returns the payload with per-datum sources.
   */
  router.post("/", async (req, res) => {
    const address = (req.body && req.body.address ? String(req.body.address) : "").trim();
    if (!address) return res.status(400).json({ error: "Address is required" });

    try {
      const geo = await geocode(address);

      // Prefer the EXACT building the geocoder resolved to (Nominatim/Photon
      // return the OSM way/relation id of the addressed building), falling back
      // to the nearest building footprint, then a Nominatim name/address lookup.
      // When the geocoder hit is a ROAD (e.g. "133 Wai Yip Street" resolves to the
      // street way), skip the exact-element query — street ways can be enormous and
      // slow Overpass — and go straight to the nearest-building lookup.
      const geoIsRoad = !!(geo.class === "highway" || isRoadType(geo.type));

      const [building, climate] = await Promise.all([
        (async () => {
          // 1) Exact building element via Overpass (full tags + footprint)
          if (!geoIsRoad && geo.osmType && geo.osmId) {
            const exact = await queryBuildingById(geo.osmType, geo.osmId);
            if (exact && exact.building) return exact;
          }
          // 2) Nearest building via Overpass
          const near = await queryBuilding(geo.lat, geo.lon);
          if (near && near.building) return near;
          // 3) Last resort: exact element name/address via Nominatim lookup
          if (!geoIsRoad && geo.osmType && geo.osmId) {
            const nom = await queryBuildingByNominatim(geo.osmType, geo.osmId);
            if (nom && nom.building) return nom;
          }
          return near; // may be null — scored from climate + defaults
        })(),
        getClimate(geo.lat, geo.lon)
      ]);

      const score = computeScore({ building: building || {}, climate, geocode: geo });

      // Real photos + user comments (may be empty/unavailable — shown honestly)
      const name = (building && building.name) || score.inputs.buildingType || "";
      const [images, reviews] = await Promise.all([
        name ? findBuildingImages(name, 4) : Promise.resolve([]),
        name ? findUserReviews(name) : Promise.resolve({ available: false, note: "No building name to search for." })
      ]);

      // Confirmed defects = ONLY evidence-backed items (user reviews + OSM tags).
      // Risk indicators (score.kris) are kept separate — they are desk-based estimates.
      const confirmedDefects = [
        ...(reviews.defects || []).map((d) => ({
          name: d.name,
          pillar: d.pillar,
          icon: d.icon,
          source: "Google Maps user review",
          evidence: d.evidence,
          author: d.author,
          date: d.date
        })),
        ...((building && building.conditionNotes) || []).map((n) => ({
          name: "Community-reported condition note",
          pillar: "safety",
          icon: "message-square-warning",
          source: "OpenStreetMap tag",
          evidence: n
        }))
      ];

      const analysis = {
        id: uid("ana"),
        address,
        resolvedAddress: geo.displayName,
        coordinates: { lat: round6(geo.lat), lon: round6(geo.lon) },
        mapTile: tileFor(geo.lat, geo.lon, 18),
        building: building || null,
        images,
        reviews,
        confirmedDefects,
        score,
        sources: buildSources(geo, building, climate, score, images),
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

/** Nominatim/Photon road "type" values — when the geocoder hit is a street, we
 * skip the exact-element query (street ways are huge and slow Overpass). */
const ROAD_TYPES = new Set([
  "primary", "primary_link", "secondary", "secondary_link", "tertiary", "tertiary_link",
  "residential", "unclassified", "motorway", "motorway_link", "trunk", "trunk_link",
  "service", "living_street", "pedestrian", "footway", "cycleway", "path", "steps",
  "track", "road", "highway"
]);
function isRoadType(t) {
  if (!t) return false;
  return ROAD_TYPES.has(String(t).toLowerCase());
}

/* ---------------- source references ---------------- */

const PROVIDER_SOURCE = {
  nominatim: { name: "OpenStreetMap Nominatim", url: "https://nominatim.org/" },
  photon: { name: "Photon (Komoot) geocoder", url: "https://photon.komoot.io/" },
  "open-meteo": { name: "Open-Meteo Geocoding", url: "https://open-meteo.com/en/docs/geocoding-api" }
};

/** Build an auditable list of { label, value, source, url } for every datum. */
function buildSources(geo, building, climate, score, images) {
  const sources = [];
  const locUrl =
    "https://www.openstreetmap.org/?mlat=" + geo.lat + "&mlon=" + geo.lon + "#map=17/" + geo.lat + "/" + geo.lon;

  const geoSource = PROVIDER_SOURCE[geo.provider] || { name: geo.provider || "Geocoder", url: locUrl };
  sources.push({
    label: "Address resolution",
    value: geo.displayName,
    source: geoSource.name,
    url: geoSource.url
  });

  if (building) {
    const osmType = (building.osmId || "").split("/")[0];
    const osmId = (building.osmId || "").split("/")[1];
    sources.push({
      label: "Building footprint & attributes",
      value: (building.name ? building.name + " · " : "") +
        (building.building || "building") +
        (building.buildingLevels ? " · " + building.buildingLevels + " levels" : "") +
        (building.buildingHeight ? " · " + building.buildingHeight + " m" : ""),
      source: "OpenStreetMap (Overpass API)",
      url: osmType && osmId ? `https://www.openstreetmap.org/${osmType}/${osmId}` : locUrl
    });
  }

  if (climate) {
    sources.push({
      label: "Climate exposure (past 12 months)",
      value: "Max gust " + climate.maxGustKmh + " km/h · " + climate.annualPrecipMm + " mm rain · max " + climate.maxTempC + "°C",
      source: "Open-Meteo Historical Weather API",
      url: "https://open-meteo.com/en/docs/historical-weather-api"
    });
  }

  if (images && images.length) {
    images.forEach((img) => {
      sources.push({
        label: "Building photograph",
        value: img.title + (img.license ? " · " + img.license : ""),
        source: "Wikimedia Commons" + (img.artist ? " · " + img.artist : ""),
        url: img.pageUrl
      });
    });
  }

  sources.push({
    label: "BuildingConditionScore methodology",
    value: "Composite of Safety, Serviceability & Sustainability indices (0–100)",
    source: "RaSpect Inspectica",
    url: "https://dhanada.github.io/raspect-buildingconditionscore/methodology.html"
  });

  return sources;
}
