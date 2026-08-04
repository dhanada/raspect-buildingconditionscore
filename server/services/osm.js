/**
 * Building data service — fetches real building attributes from
 * OpenStreetMap via the free Overpass API.
 *
 * Returns: footprint polygon, address components, building type, height,
 * levels, roof/material where mapped, start_date (year built) where mapped,
 * and building-name where mapped.
 */
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || "RaSpect-Inspectica/1.0";

const OVERPASS_ENDPOINTS = [
  process.env.OVERPASS_URL,
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter"
].filter(Boolean);

const cache = new Map(); // `${lat},${lon},${radius}` -> result

/**
 * @param {number} lat
 * @param {number} lon
 * @param {number} radiusMeters search radius around the point
 */
async function queryBuilding(lat, lon, radiusMeters = 60) {
  const key = `${lat.toFixed(5)},${lon.toFixed(5)},${radiusMeters}`;
  if (cache.has(key)) return cache.get(key);

  // Overpass QL: find the closest building way/relation near the point.
  // `out geom;` embeds full node geometry so we get the footprint polygon.
  const overpassQuery = `
    [out:json][timeout:25];
    (
      way(around:${radiusMeters},${lat},${lon})["building"];
      relation(around:${radiusMeters},${lat},${lon})["building"];
    );
    out geom;
  `;

  let data = null;
  let lastErr = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: "data=" + encodeURIComponent(overpassQuery),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
          "Accept": "application/json"
        }
      });
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status} @ ${endpoint}`);
      data = await res.json();
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!data) throw lastErr || new Error("Overpass unavailable");

  const elements = data.elements || [];
  if (!elements.length) {
    const result = null;
    cache.set(key, result);
    return result;
  }

  // Prefer a way/relation that has a name or more tags; fall back to first.
  const candidates = elements.filter((e) => e.type === "way" || e.type === "relation");
  candidates.sort((a, b) => tagScore(b.tags) - tagScore(a.tags));
  const picked = candidates[0];

  // Extract footprint polygon from embedded geometry (out geom).
  const footprint = Array.isArray(picked.geometry)
    ? picked.geometry.map((g) => [g.lon, g.lat])
    : [];

  const tags = picked.tags || {};
  const result = {
    osmId: `${picked.type}/${picked.id}`,
    name: tags.name || null,
    building: tags.building || null,
    buildingLevels: parseNum(tags["building:levels"]),
    buildingHeight: parseNum(tags.height),
    buildingMaterial: tags["building:material"] || null,
    roofShape: tags["roof:shape"] || null,
    roofMaterial: tags["roof:material"] || null,
    roofHeight: parseNum(tags["roof:height"]),
    yearBuilt: parseNum(tags.start_date) || parseYear(tags) || null,
    conditionNotes: [
      tags["building:condition"],
      tags.fixme,
      tags.note,
      tags["addr:note"]
    ].filter(Boolean).map((s) => String(s).slice(0, 300)),
    addr: {
      street: tags["addr:street"] || null,
      housenumber: tags["addr:housenumber"] || null,
      city: tags["addr:city"] || null,
      postcode: tags["addr:postcode"] || null,
      country: tags["addr:country"] || null
    },
    footprint: footprint.length >= 3 ? footprint : null
  };

  // Derive footprint area from polygon (shoelace formula on lon/lat —
  // approximate planar area, fine for relative comparisons).
  result.footprintAreaM2 = footprint.length >= 3 ? polygonAreaM2(footprint) : null;

  cache.set(key, result);
  return result;
}

/* ---------------- helpers ---------------- */

function parseNum(v) {
  if (v === undefined || v === null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

function parseYear(tags) {
  const src = tags["source:date"] || tags["building:condition"] || tags["condition"] || null;
  if (!src) return null;
  const m = String(src).match(/(19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : null;
}

function tagScore(tags = {}) {
  let s = 0;
  if (tags.name) s += 4;
  if (tags.height || tags["building:levels"]) s += 3;
  if (tags["building:material"] || tags["roof:material"]) s += 2;
  if (tags.start_date || tags.addr) s += 1;
  return s;
}

/** Shoelace formula for planar polygon area in m² (approx at small scale). */
function polygonAreaM2(coords) {
  const mPerDeg = 111320;
  const ring = [...coords, coords[0]];
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2) * (mPerDeg * mPerDeg);
}

module.exports = { queryBuilding };
