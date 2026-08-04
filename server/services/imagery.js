/**
 * Imagery service
 *  - OpenStreetMap tile URLs for the interactive footprint map.
 *  - Wikimedia Commons search for real building photos (facade/elevation),
 *    free + keyless, with attribution + source links.
 */
const cache = new Map();

function tileFor(lat, lon, zoom) {
  const z = zoom || 18;
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, z);
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { zoom: z, x, y, url: `https://tile.openstreetmap.org/${z}/${x}/${y}.png` };
}

/* ------------------------------------------------------------------ *
 * Wikimedia Commons
 * ------------------------------------------------------------------ */

const WIKIMEDIA_API = "https://commons.wikimedia.org/w/api.php";

/**
 * Find real photos of a building on Wikimedia Commons.
 * @param {string} name  building name (e.g. "One Canada Square")
 * @param {number} limit max images to return
 * @returns {Promise<Array>} ranked image objects with url, pageUrl, license, artist, description
 */
async function findBuildingImages(name, limit = 4) {
  if (!name) return [];
  const key = name.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);

  try {
    // Three searches: the name, name+building, and name+facade terms (to prefer elevations).
    // The strict relevance filter in rankByRelevance() ensures we only keep photos whose
    // title actually references THIS building — never arbitrary "facade" photos.
    const [plain, building, facade] = await Promise.all([
      commonsSearch(`${name}`),
      commonsSearch(`${name} building`),
      commonsSearch(`${name} facade OR elevation OR exterior`)
    ]);
    const merged = mergeAndRank(plain, building, facade);
    const withMeta = await enrich(merged.slice(0, limit * 5));
    const ranked = rankByRelevance(withMeta, name).slice(0, limit);
    cache.set(key, ranked);
    return ranked;
  } catch (err) {
    console.warn("[imagery] Wikimedia search failed:", err.message);
    return [];
  }
}

async function commonsSearch(query) {
  const url =
    WIKIMEDIA_API + "?action=query&list=search&format=json&origin=*&srnamespace=6" +
    "&srlimit=12&srwhat=text&srsearch=" + encodeURIComponent(query);
  const res = await fetch(url, {
    headers: { "User-Agent": "RaSpect-Inspectica/1.0", Accept: "application/json" },
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error("Wikimedia HTTP " + res.status);
  const data = await res.json();
  return (data.query && data.query.search) || [];
}

/** Fetch imageinfo (thumbnail + attribution) for a list of file titles. */
async function enrich(searchResults) {
  const titles = searchResults.map((r) => r.title).filter(Boolean).slice(0, 20);
  if (!titles.length) return [];
  const url =
    WIKIMEDIA_API + "?action=query&format=json&origin=*&prop=imageinfo" +
    "&iiprop=url|extmetadata&iiurlwidth=1200&titles=" + encodeURIComponent(titles.join("|"));
  const res = await fetch(url, {
    headers: { "User-Agent": "RaSpect-Inspectica/1.0", Accept: "application/json" },
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error("Wikimedia imageinfo HTTP " + res.status);
  const data = await res.json();
  const pages = (data.query && data.query.pages) || {};
  const out = [];
  for (const p of Object.values(pages)) {
    const ii = p.imageinfo && p.imageinfo[0];
    if (!ii) continue;
    const meta = ii.extmetadata || {};
    out.push({
      title: p.title,
      url: ii.thumburl || ii.url,
      fullUrl: ii.url,
      width: ii.thumbwidth || null,
      pageUrl: "https://commons.wikimedia.org/wiki/" + p.title.replace(/^File:/, "File:").replace(/ /g, "_"),
      license: strip(meta.LicenseShortName && meta.LicenseShortName.value) || null,
      artist: strip(meta.Artist && meta.Artist.value) || null,
      description: strip(meta.ImageDescription && meta.ImageDescription.value) || null
    });
  }
  return out;
}

/** Merge two search result sets, de-duplicating by title. */
function mergeAndRank(a, b) {
  const seen = new Set();
  const merged = [];
  const push = (list) => list.forEach((r) => {
    if (!r || !r.title || seen.has(r.title)) return;
    seen.add(r.title);
    merged.push(r);
  });
  push(a);
  push(b);
  return merged;
}

/**
 * Score each image by how likely it is a usable facade photo of the building.
 * STRICT: a photo is only kept when its TITLE references the building name or a
 * distinctive name token — otherwise unrelated "facade/exterior" search results
 * would be misrepresented as photos of the building.
 */
const TITLE_STOP_WORDS = new Set([
  "building", "tower", "towers", "centre", "center", "house", "plaza", "square",
  "hall", "park", "complex", "block", "the", "and", "of", "city", "street", "road"
]);

function rankByRelevance(images, name) {
  const nameLc = (name || "").toLowerCase().replace(/[«»]/g, "").trim();
  const nameWords = nameLc
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length >= 4 && !TITLE_STOP_WORDS.has(w));

  return images
    .map((img) => {
      const titleLc = (img.title || "").toLowerCase();
      const descLc = (img.description || "").toLowerCase();
      // A photo must reference THIS building in its title to be shown.
      const titleMatchesName =
        titleLc.includes(nameLc) || nameWords.some((w) => titleLc.includes(w));
      if (!titleMatchesName) return null;

      let s = 0;
      if (titleLc.includes(nameLc)) s += 10;
      else if (nameWords.some((w) => titleLc.includes(w))) s += 4;
      // facade / elevation / exterior signals
      if (/(facade|elevation|exterior|front view|side view|front elevation)/.test(titleLc)) s += 5;
      // non-photo file types are undesirable
      if (/\.(svg|pdf|djvu|ogg|ogv|webm)$/.test(img.title)) s -= 20;
      if (/diagram|floor plan|map|logo|icon|drawing|plan/.test(titleLc + " " + descLc)) s -= 10;
      // bigger thumbnails preferred
      if (img.width && img.width >= 400) s += 1;
      return { ...img, _score: s };
    })
    .filter(Boolean)
    .sort((x, y) => y._score - x._score)
    .map(({ _score, ...rest }) => rest);
}

function strip(v) {
  if (!v) return null;
  return String(v).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 200) || null;
}

module.exports = { tileFor, findBuildingImages };
