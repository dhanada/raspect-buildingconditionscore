/**
 * Geocoding service — resolves an address string to coordinates.
 *
 * Fallback chain (all free, no API keys):
 *   1. OpenStreetMap Nominatim  — richest results, but can be flaky from datacenters
 *   2. Photon (Komoot)          — reliable street-level geocoding
 *   3. Open-Meteo               — city/place level (last resort)
 */
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || "RaSpect-Inspectica/1.0 (contact: hello@raspect.ai)";

const cache = new Map(); // address -> result

async function geocode(address) {
  const key = String(address).trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const attempts = [geocodeNominatim, geocodePhoton, geocodeOpenMeteo];
  let lastErr = null;
  for (const fn of attempts) {
    try {
      const result = await fn(address);
      cache.set(key, result);
      return result;
    } catch (err) {
      lastErr = err;
      if (err.code !== "NOT_FOUND") throw err; // real failure — don't mask it
    }
  }
  throw lastErr || new Error("Address not found");
}

/* ---------------- Nominatim ---------------- */

async function geocodeNominatim(address) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" +
    encodeURIComponent(address);

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" }
  });
  if (!res.ok) throw new Error("Geocoding failed: HTTP " + res.status);

  const data = await res.json();
  if (!data || !data.length) notFound();

  const hit = data[0];
  return {
    provider: "nominatim",
    lat: parseFloat(hit.lat),
    lon: parseFloat(hit.lon),
    displayName: hit.display_name,
    type: hit.type,
    class: hit.class,
    importance: hit.importance,
    boundingbox: hit.boundingbox ? hit.boundingbox.map(Number) : null
  };
}

/* ---------------- Photon (Komoot) ---------------- */

async function geocodePhoton(address) {
  const url = "https://photon.komoot.io/api/?limit=1&lang=en&q=" + encodeURIComponent(address);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error("Photon geocoding failed: HTTP " + res.status);

  const data = await res.json();
  const f = data && data.features && data.features[0];
  if (!f) notFound();

  const p = f.properties || {};
  const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean);
  return {
    provider: "photon",
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    displayName: parts.join(", "),
    type: p.type || p.osm_value || null,
    class: p.osm_key || null,
    importance: null,
    boundingbox: null
  };
}

/* ---------------- Open-Meteo (city-level) ---------------- */

async function geocodeOpenMeteo(address) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=" +
    encodeURIComponent(address);

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error("Fallback geocoding failed: HTTP " + res.status);

  const data = await res.json();
  const hit = data && data.results && data.results[0];
  if (!hit) notFound();

  const parts = [hit.name, hit.admin1, hit.country].filter(Boolean);
  return {
    provider: "open-meteo",
    lat: hit.latitude,
    lon: hit.longitude,
    displayName: parts.join(", "),
    type: hit.feature_code || null,
    class: hit.feature_code ? "place" : null,
    importance: null,
    boundingbox: null
  };
}

function notFound() {
  const err = new Error("Address not found");
  err.code = "NOT_FOUND";
  throw err;
}

module.exports = { geocode };
