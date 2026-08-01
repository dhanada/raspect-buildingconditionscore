/**
 * Geocoding service — resolves an address string to coordinates.
 * Uses the free OpenStreetMap Nominatim API (no key required).
 * https://nominatim.org/release-docs/latest/api/Search/
 */
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || "RaSpect-Inspectica/1.0";

const cache = new Map(); // address -> result

async function geocode(address) {
  const key = String(address).trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" +
    encodeURIComponent(address);

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" }
  });
  if (!res.ok) throw new Error("Geocoding failed: HTTP " + res.status);

  const data = await res.json();
  if (!data || !data.length) {
    const err = new Error("Address not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const hit = data[0];
  const result = {
    lat: parseFloat(hit.lat),
    lon: parseFloat(hit.lon),
    displayName: hit.display_name,
    type: hit.type,
    class: hit.class,
    importance: hit.importance,
    boundingbox: hit.boundingbox ? hit.boundingbox.map(Number) : null
  };
  cache.set(key, result);
  return result;
}

module.exports = { geocode };
