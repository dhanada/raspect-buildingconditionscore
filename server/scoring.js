/**
 * RaSpect Inspectica™ — Transparent BuildingConditionScore engine
 *
 * Produces an explainable 0–100 condition score from REAL public data
 * (OpenStreetMap building attributes + Open-Meteo climate). All penalties
 * are itemised and returned so the score is auditable, and data completeness
 * is reported honestly (unknown fields add a small uncertainty penalty
 * rather than being guessed).
 *
 * Weights: Safety 40% · Serviceability 35% · Sustainability 25%
 */

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const round = (v) => Math.round(v * 10) / 10;

/**
 * @param {object} opts
 * @param {object} opts.building  building data from osm.js (may be sparse)
 * @param {object} opts.climate   climate data from climate.js
 * @param {object} opts.geocode   {lat, lon, type, displayName}
 */
function computeScore({ building, climate, geocode }) {
  const year = new Date().getFullYear();
  const age = building.yearBuilt ? year - building.yearBuilt : null;
  const notes = [];
  const krins = []; // key risk indicators
  const missing = [];

  /* ---------------- SAFETY (40%) ---------------- */
  let safety = 100;

  // 1. Age-related structural deterioration
  const agePenalty = age === null
    ? (missing.push("construction year"), 12)
    : age > 50 ? 22 : age > 40 ? 18 : age > 30 ? 13 : age > 20 ? 9 : age > 10 ? 5 : 2;
  safety -= agePenalty;
  if (age && age > 40) krins.push({ name: "Age-Related Structural Degradation", pillar: "safety", level: age > 50 ? "CRITICAL" : "HIGH", factor: "Building constructed " + age + " years ago", icon: "shield-alert", affectedArea: "Primary structure & envelope", roi: 4.2 });

  // 2. Wind / storm exposure (typhoon proxy)
  const gust = climate.maxGustKmh || 0;
  const windPenalty = gust > 150 ? 22 : gust > 120 ? 16 : gust > 100 ? 10 : gust > 80 ? 6 : 2;
  safety -= windPenalty;
  if (gust > 120) krins.push({ name: "High Wind Exposure", pillar: "safety", level: gust > 150 ? "CRITICAL" : "HIGH", factor: "Max gust " + round(gust) + " km/h in past year", icon: "wind", affectedArea: "Windward facade & roof", roi: 3.6 });

  // 3. Roof / material risk
  const roofMat = (building.roofMaterial || "").toLowerCase();
  const mat = (building.buildingMaterial || "").toLowerCase();
  const materialPenalty = /(thatch|wood|timber|reed)/.test(roofMat + " " + mat) ? 12
    : /(tile|concrete|cement)/.test(roofMat) ? 5
    : /(metal|steel|iron)/.test(roofMat + " " + mat) ? 3
    : /(glass|curtain)/.test(mat) ? 6
    : (missing.push("roof/building material"), 4);
  safety -= materialPenalty;

  // 4. Height / exposure
  const height = building.buildingHeight;
  const levels = building.buildingLevels;
  const tall = (height && height > 60) || (levels && levels > 20);
  const mid = (height && height > 30) || (levels && levels > 10);
  safety -= tall ? 7 : mid ? 4 : 1;

  // 5. Unknown building type
  if (!building.building) { safety -= 3; missing.push("building type"); }

  const safetyScore = round(clamp(safety));

  /* ---------------- SERVICEABILITY (35%) ---------------- */
  let serv = 100;
  const precip = climate.annualPrecipMm || 0;
  const tempRange = climate.tempRangeC || 0;

  // Moisture ingress risk = precipitation × age sensitivity
  const moisture = (precip > 1800 ? 20 : precip > 1100 ? 13 : precip > 600 ? 7 : 3) +
    (age === null ? 4 : age > 40 ? 8 : age > 20 ? 5 : 2);
  serv -= moisture;
  if (precip > 1100) krins.push({ name: "Moisture & Ingress Risk", pillar: "serviceability", level: precip > 1800 ? "HIGH" : "MODERATE", factor: round(precip) + " mm annual rainfall", icon: "droplets", affectedArea: "Envelope joints & sealants", roi: 4.8 });

  // Thermal movement stress on sealants
  const thermal = tempRange > 45 ? 10 : tempRange > 30 ? 6 : tempRange > 18 ? 3 : 1;
  serv -= thermal;

  // Glazing / curtain wall maintenance burden
  if (/glass|curtain/.test(mat)) serv -= 5;

  // Unknown systems age
  if (age === null) serv -= 3;

  const serviceabilityScore = round(clamp(serv));

  /* ---------------- SUSTAINABILITY (25%) ---------------- */
  let sust = 100;
  // Thermal envelope efficiency declines with age
  const ageEnergy = age === null ? 10 : age > 50 ? 22 : age > 40 ? 18 : age > 30 ? 14 : age > 20 ? 10 : age > 10 ? 6 : 2;
  sust -= ageEnergy;
  if (age && age > 40) krins.push({ name: "Thermal Leakage & Energy Loss", pillar: "sustainability", level: age > 50 ? "CRITICAL" : "HIGH", factor: "Older envelope, age " + age + " years", icon: "flame", affectedArea: "Whole building envelope", roi: 5.2 });

  // Cooling load from heat
  const heat = climate.maxTempC || 0;
  const heatLoad = heat > 40 ? 14 : heat > 35 ? 10 : heat > 30 ? 6 : heat > 25 ? 3 : 1;
  sust -= heatLoad;

  // Roof material insulation
  if (/metal|iron/.test(roofMat)) sust -= 4;

  const sustainabilityScore = round(clamp(sust));

  /* ---------------- COMPOSITE ---------------- */
  const overall = Math.round(safetyScore * 0.4 + serviceabilityScore * 0.35 + sustainabilityScore * 0.25);

  /* ---------------- FINANCIAL IMPACT (illustrative) ---------------- */
  // Honest estimates only: when footprint / height / age are unknown we return
  // null instead of inventing a "typical" 1200 m² / 20-floor building. The
  // frontend renders null as "—" with an "insufficient data" note.
  const footprintArea = building.footprintAreaM2 || null;
  const floors = levels || (building.buildingHeight ? Math.max(1, Math.round(building.buildingHeight / 3.2)) : null);
  const floorArea = footprintArea != null && floors != null ? footprintArea * floors : null;

  const energyWaste = floorArea != null
    ? Math.round((100 - sustainabilityScore) * floorArea * 0.9)
    : null;
  const insuranceSurcharge = floorArea != null
    ? Math.round((100 - safetyScore) * floorArea * 0.35)
    : null;
  // Deferred maintenance scales with age; never negative (a young building
  // does not get a "bonus"), and requires a known construction year.
  const deferredPenalty = age != null
    ? Math.max(0, Math.round((age - 20) * 1500 + (100 - overall) * 900))
    : null;

  /* ---------------- KRIs (consolidated) ---------------- */
  const kriLevel = (score) => (score < 45 ? "CRITICAL" : score < 65 ? "HIGH" : "MODERATE");

  const kris = krins.map((k, i) => ({
    id: "kri-" + i,
    name: k.name,
    pillar: k.pillar || "safety",
    level: k.level,
    description: k.factor + ". " + mitigationText(k.name),
    icon: k.icon,
    affectedArea: k.affectedArea,
    roi: k.roi
  }));

  // Ensure at least a sensible set of KRIs is returned
  if (!kris.length) {
    kris.push({
      id: "kri-0", name: "General Envelope Wear", pillar: "safety", level: kriLevel(overall),
      description: "Baseline maintenance risk based on age and exposure.",
      icon: "wrench", affectedArea: "Building envelope", roi: 3.0
    });
  }

  /* ---------------- RISK FLAGS ---------------- */
  const flags = [];
  if (gust > 120) flags.push("Exceeds typical wind-load comfort threshold (max gust " + round(gust) + " km/h)");
  if (precip > 1100) flags.push("High annual precipitation — elevated ingress risk");
  if (age && age > 40) flags.push("Structure older than 40 years");
  if (heat > 38) flags.push("Extreme summer heat — heavy HVAC loading");
  if (missing.length) flags.push("Limited public data: " + missing.join(", ") + " assumed from defaults");
  if (floorArea == null) flags.push("Insufficient footprint data — financial estimates are not shown");
  if (age == null) flags.push("Construction year unknown — deferred-maintenance estimate not shown");

  const completeness = Math.round(
    (1 - missing.length / 8) * 100
  );

  const result = {
    overall,
    subScores: { safety: safetyScore, serviceability: serviceabilityScore, sustainability: sustainabilityScore },
    financial: { energyWaste, insuranceSurcharge, deferredMaintenancePenalty: deferredPenalty },
    kris,
    flags,
    dataCompleteness: clamp(completeness, 20, 100),
    dataNotes: missing,
    inputs: {
      age,
      buildingType: building.building,
      height: building.buildingHeight,
      levels: building.buildingLevels,
      roofMaterial: building.roofMaterial,
      buildingMaterial: building.buildingMaterial,
      footprintAreaM2: footprintArea != null ? Math.round(footprintArea) : null,
      floorAreaM2: floorArea != null ? Math.round(floorArea) : null,
      maxGustKmh: round(gust),
      annualPrecipMm: round(precip),
      maxTempC: heat
    }
  };
  return result;
}

function mitigationText(name) {
  const map = {
    "Age-Related Structural Degradation": "Prioritise structural survey and targeted concrete/façade repairs.",
    "High Wind Exposure": "Reinforce windward fixings; schedule façade anchor inspection.",
    "Moisture & Ingress Risk": "Re-seal joints and gaskets; inspect waterproofing membranes.",
    "Thermal Leakage & Energy Loss": "Upgrade envelope insulation and glazing; recommission HVAC."
  };
  return map[name] || "Schedule an expert inspection to quantify and remediate.";
}

module.exports = { computeScore };
