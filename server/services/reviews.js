/**
 * User-review service — detects REAL user-reported defects from online
 * reviews (Google Places). Optional: requires a GOOGLE_PLACES_API_KEY env var.
 * When no key is configured, it returns { available: false } so the UI can
 * honestly say "No user comment data available" instead of guessing.
 */
const API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const cache = new Map();

const DEFECT_KEYWORDS = [
  { re: /(leak|water ingress|seepage|damp|water damage)/i, name: "Water leakage / ingress", pillar: "serviceability", icon: "droplets" },
  { re: /(crack|cracked)/i, name: "Cracks in structure / cladding", pillar: "safety", icon: "shield-alert" },
  { re: /(spalling|crumbling|falling concrete|chipping)/i, name: "Concrete spalling", pillar: "safety", icon: "shield-alert" },
  { re: /(mold|mould|condensation)/i, name: "Mould / condensation", pillar: "serviceability", icon: "thermometer-snowflake" },
  { re: /(window draft|window seal|draft|sealant|gasket)/i, name: "Window seal / draft issues", pillar: "serviceability", icon: "square-dashed-bottom" },
  { re: /(scaffolding|scaffold|safety netting|protective netting)/i, name: "Active facade maintenance works", pillar: "safety", icon: "hard-hat" },
  { re: /(rust|corrosion|staining|stained)/i, name: "Corrosion / staining", pillar: "safety", icon: "flame" },
  { re: /(facade|cladding|tile|curtain wall|exterior) (failure|fault|issue|falling|detach|loose)/i, name: "Facade / cladding defect", pillar: "safety", icon: "building-2" },
  { re: /(hot|too warm|temperature|hvac|air.?con)/i, name: "Thermal comfort / HVAC concerns", pillar: "sustainability", icon: "flame" }
];

/**
 * @param {string} buildingName
 * @returns {Promise<object>} { available, placeId?, rating?, reviews?, defects?, note? }
 */
async function findUserReviews(buildingName) {
  if (!API_KEY) {
    return { available: false, note: "Google Places API key not configured — user comment data unavailable." };
  }
  const key = (buildingName || "").trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);

  try {
    const placeId = await findPlaceId(buildingName);
    if (!placeId) {
      const r = { available: true, placeId: null, note: "Place not found on Google Maps." };
      cache.set(key, r);
      return r;
    }
    const details = await placeDetails(placeId);
    const reviews = (details.reviews || []).map((rv) => ({
      author: rv.author_name || "Anonymous",
      rating: rv.rating || null,
      date: rv.relative_time_description || null,
      text: (rv.text || "").slice(0, 500)
    }));
    const defects = [];
    reviews.forEach((rv) => {
      DEFECT_KEYWORDS.forEach((k) => {
        const m = k.re.exec(rv.text);
        if (m) {
          defects.push({
            name: k.name,
            pillar: k.pillar,
            icon: k.icon,
            source: "user-review",
            evidence: rv.text.slice(Math.max(0, m.index - 60), m.index + 120) + "…",
            author: rv.author,
            date: rv.date
          });
        }
      });
    });
    const result = {
      available: true,
      placeId,
      rating: details.rating || null,
      userRatingsTotal: details.user_ratings_total || null,
      reviews,
      defects,
      note: null
    };
    cache.set(key, result);
    return result;
  } catch (err) {
    console.warn("[reviews] Google Places failed:", err.message);
    return { available: true, placeId: null, note: "Failed to fetch user reviews." };
  }
}

async function findPlaceId(name) {
  const url =
    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=" +
    encodeURIComponent(name) + "&inputtype=textquery&fields=place_id&key=" + API_KEY;
  const res = await fetch(url);
  const data = await res.json();
  return data.candidates && data.candidates[0] ? data.candidates[0].place_id : null;
}

async function placeDetails(placeId) {
  const url =
    "https://maps.googleapis.com/maps/api/place/details/json?place_id=" +
    encodeURIComponent(placeId) + "&fields=rating,user_ratings_total,reviews&key=" + API_KEY;
  const res = await fetch(url);
  const data = await res.json();
  return data.result || {};
}

module.exports = { findUserReviews };
