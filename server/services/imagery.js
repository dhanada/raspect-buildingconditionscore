/**
 * Imagery service — free OpenStreetMap tile URLs for the building location.
 * The frontend renders the footprint on an interactive Leaflet map using
 * these tiles. No API key required.
 */
function tileFor(lat, lon, zoom) {
  const z = zoom || 18;
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, z);
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return {
    zoom: z,
    x,
    y,
    url: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
  };
}

module.exports = { tileFor };
