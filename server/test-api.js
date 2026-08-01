/**
 * Test script — calls the score API with a few real addresses and prints
 * a concise summary of the results. Run:  node test-api.js
 */
const BASE = process.env.API_BASE || "http://localhost:4000/api";

const addresses = [
  "100 Queen's Road Central, Hong Kong",
  "1 Canada Square, London, UK",
  "Empire State Building, New York"
];

async function run() {
  for (const address of addresses) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address })
      });
      const data = await res.json();
      if (!res.ok) {
        console.log(`\n✗ "${address}" -> ${res.status}: ${data.error}`);
        continue;
      }
      const b = data.building || {};
      const s = data.score || {};
      console.log(`\n✔ "${address}" (${Date.now() - t0}ms)`);
      console.log(`  resolved: ${data.resolvedAddress}`);
      console.log(`  coords: ${data.coordinates.lat}, ${data.coordinates.lon}`);
      console.log(`  OSM: name=${b.name || "—"} type=${b.building || "—"} levels=${b.buildingLevels ?? "—"} height=${b.buildingHeight ?? "—"}m year=${b.yearBuilt ?? "—"} mat=${b.buildingMaterial || "—"} roof=${b.roofMaterial || "—"}`);
      console.log(`  footprint: ${b.footprintAreaM2 ? Math.round(b.footprintAreaM2) + " m²" : "—"} (${b.footprint ? b.footprint.length + " pts" : "none"})`);
      if (s.inputs) console.log(`  inputs: age=${s.inputs.age} gust=${s.inputs.maxGustKmh}km/h rain=${s.inputs.annualPrecipMm}mm maxTemp=${s.inputs.maxTempC}°C`);
      console.log(`  SCORE: overall=${s.overall} safety=${s.subScores?.safety} serv=${s.subScores?.serviceability} sust=${s.subScores?.sustainability} completeness=${s.dataCompleteness}%`);
      console.log(`  financial: energy=$${s.financial?.energyWaste} ins=$${s.financial?.insuranceSurcharge} defer=$${s.financial?.deferredMaintenancePenalty}`);
      console.log(`  flags: ${(s.flags || []).join(" | ") || "none"}`);
    } catch (e) {
      console.log(`\n✗ "${address}" -> ERROR: ${e.message}`);
    }
  }
}

run();
