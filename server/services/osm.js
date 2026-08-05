/**
 * Building data service — fetches real building attributes from
 * OpenStreetMap via the free Overpass API.
 *
 * Returns: footprint polygon, address components, building type, height,
 * levels, roof/material where mapped, start_date (year built) where mapped,
 * and building-name where mapped.
 */
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || "RaSpect-Inspectica/1.0";

// Mirrors are flaky at times; prefer the ones that are currently responsive.
// Note: some mirrors are region-limited (e.g. overpass.osm.ch is Swiss-only) and
// return an EMPTY result for non-Europe — runOverpass() skips empty results so we
// fall through to a global mirror instead of short-circuiting on no data.
const OVERPASS_MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.ch/api/interpreter"
];
const OVERPASS_ENDPOINTS = Array.from(new Set([
  ...OVERPASS_MIRRORS,
  ...(process.env.OVERPASS_URL ? [process.env.OVERPASS_URL] : [])
]));

const cache = new Map(); // `${lat},${lon},${radius}` -> result

/**
 * @param {number} lat
 * @param {number} lon
 * @param {number} radiusMeters search radius around the point
 */
async function queryBuilding(lat, lon, radiusMeters = 150) {
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

  const data = await runOverpass(overpassQuery);
  const elements = data ? data.elements || [] : [];
  if (!elements.length) {
    const result = null;
    cache.set(key, result);
    return result;
  }

  // Prefer a way/relation that has a name or more tags; fall back to first.
  const candidates = elements.filter((e) => e.type === "way" || e.type === "relation");
  candidates.sort((a, b) => tagScore(b.tags) - tagScore(a.tags));
  const picked = candidates[0];

  const result = toBuildingResult(picked);
  cache.set(key, result);
  return result;
}

/**
 * Query a SPECIFIC OSM element (e.g. the exact building Nominatim resolved the
 * address to). Returns null when the element is missing or is not a building,
 * so the caller can fall back to the nearest-building lookup.
 * @param {string} osmType  "way" | "relation" | "node"
 * @param {number|string} osmId
 */
async function queryBuildingById(osmType, osmId) {
  const type = normalizeOsmType(osmType);
  if (!type || type === "node" || !osmId) return null;
  const key = `${type}/${osmId}`;
  if (cache.has(key)) return cache.get(key);

  // `out body geom;` returns tags + embedded geometry for a single element
  // (plain `out geom;` 504s on some mirrors for large ways).
  const overpassQuery = `[out:json][timeout:15];${type}(${osmId});out body geom;`;
  const data = await runOverpass(overpassQuery);
  const el = data && data.elements && data.elements[0];
  if (!el || !el.tags || !el.tags.building) {
    cache.set(key, null);
    return null;
  }
  const result = toBuildingResult(el);
  cache.set(key, result);
  return result;
}

/** Fetch an Overpass query with endpoint failover + timeout. Returns null on total failure.
 *  Skips endpoints that return an EMPTY element list (region-limited mirrors), so a
 *  global mirror is always preferred when data exists. */
async function runOverpass(overpassQuery, timeoutMs = 8000) {
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
        },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status} @ ${endpoint}`);
      const data = await res.json();
      if (data && Array.isArray(data.elements) && data.elements.length) {
        return data;
      }
      lastErr = new Error(`Overpass empty result @ ${endpoint}`);
    } catch (err) {
      lastErr = err;
    }
  }
  console.warn("[osm] Overpass unavailable:", lastErr && lastErr.message);
  return null;
}

/**
 * Last-resort fallback: fetch the exact OSM element's name/address from the
 * Nominatim lookup API (more reliable than Overpass when mirrors are down).
 * Overpass is preferred because it also returns levels/height/material + footprint;
 * Nominatim only returns name, type and address. Returns null if not a building.
 */
async function queryBuildingByNominatim(osmType, osmId) {
  const type = normalizeOsmType(osmType);
  if (!type || !osmId) return null;
  const prefix = type === "way" ? "W" : type === "relation" ? "R" : "N";
  const key = `nom-${type}/${osmId}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const url = `https://nominatim.openstreetmap.org/lookup?osm_ids=${prefix}${osmId}&format=jsonv2`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) throw new Error("Nominatim lookup HTTP " + res.status);
    const arr = await res.json();
    const d = (arr && arr[0]) || null;
    if (!d) { cache.set(key, null); return null; }

    const building = mapBuildingType(d.type);
    if (!building) { cache.set(key, null); return null; }

    const a = d.address || {};
    const result = {
      osmId: `${type}/${osmId}`,
      name: d.name || null,
      building,
      buildingLevels: null,
      buildingHeight: null,
      buildingMaterial: null,
      roofShape: null,
      roofMaterial: null,
      roofHeight: null,
      yearBuilt: null,
      conditionNotes: [],
      addr: {
        street: a.road || null,
        housenumber: a.house_number || null,
        city: a.city || a.city_district || null,
        postcode: a.postcode || null,
        country: a.country || null
      },
      footprint: null,
      footprintAreaM2: null,
      coords: d.lat ? { lat: parseFloat(d.lat), lon: parseFloat(d.lon) } : null
    };
    cache.set(key, result);
    return result;
  } catch (err) {
    console.warn("[osm] Nominatim lookup failed:", err.message);
    return null;
  }
}

function mapBuildingType(nominatimType) {
  if (!nominatimType) return null;
  const t = String(nominatimType).toLowerCase();
  const buildingish = [
    "commercial", "office", "residential", "apartments", "house", "building",
    "hotel", "retail", "industrial", "warehouse", "service", "hospital",
    "school", "university", "government", "public", "civic"
  ];
  if (buildingish.includes(t)) return t === "building" ? "yes" : t;
  return null;
}

function normalizeOsmType(t) {
  if (!t) return null;
  const s = String(t).toLowerCase();
  if (s === "way" || s === "w") return "way";
  if (s === "relation" || s === "r") return "relation";
  if (s === "node" || s === "n") return "node";
  return s;
}

/** Build the standard building result object from an Overpass element. */
function toBuildingResult(picked) {
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

module.exports = { queryBuilding, queryBuildingById, queryBuildingByNominatim };
