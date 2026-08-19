/**
 * Climate service — pulls real historical weather stress data from the free
 * Open-Meteo Archive API (no key required).
 *
 * Returns: max wind gust, max temperature, min temperature, and total
 * precipitation for a full year at the building's location. These drive
 * Safety (wind/typhoon exposure), Serviceability (moisture ingress) and
 * Sustainability (HVAC/thermal load) sub-scores.
 */
const API = process.env.OPENMETEO_URL || "https://archive-api.open-meteo.com/v1/archive";

const cache = new Map(); // `${lat},${lon}` -> result

async function getClimate(lat, lon) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (cache.has(key)) return cache.get(key);

  const now = new Date();
  // Use *yesterday* as the end of the window: Open-Meteo's archive data for the
  // current day is not yet published, and its allowed max can lag a day behind
  // local clocks in timezones ahead of UTC (e.g. UTC+8). A full trailing year of
  // data is still covered by going back 12 months from yesterday.
  const endDate = toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const startDate = toISO(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() - 1));

  const url =
    `${API}?latitude=${lat}&longitude=${lon}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max` +
    `&timezone=auto`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("Open-Meteo failed: HTTP " + res.status);
  const data = await res.json();
  const d = data.daily || {};

  const maxTemp = maxOf(d.temperature_2m_max);
  const minTemp = minOf(d.temperature_2m_min);
  const maxWind = maxOf(d.wind_speed_10m_max);
  const maxGust = maxOf(d.wind_gusts_10m_max);
  const precip = sumOf(d.precipitation_sum);

  const result = {
    maxTempC: round(maxTemp),
    minTempC: round(minTemp),
    tempRangeC: round(maxTemp - minTemp),
    maxWindKmh: round(maxWind),
    maxGustKmh: round(maxGust),
    annualPrecipMm: round(precip),
    days: d.time ? d.time.length : 0
  };
  cache.set(key, result);
  return result;
}

function toISO(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
function maxOf(arr) { return arr && arr.length ? Math.max(...arr) : 0; }
function minOf(arr) { return arr && arr.length ? Math.min(...arr) : 0; }
function sumOf(arr) { return arr && arr.length ? arr.reduce((a, b) => a + b, 0) : 0; }
function round(v) { return Math.round(v * 10) / 10; }

module.exports = { getClimate };
