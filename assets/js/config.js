/**
 * RaSpect Inspectica™ — Frontend configuration
 *
 * Single place to point the static frontend at the backend API.
 * - Local dev:        http://localhost:4000/api
 * - After deploying:  https://your-app.up.railway.app/api  (or Render/etc.)
 *
 * NOTE: for GitHub Pages, the deployed API URL must be set here (and added to
 * the backend's CORS_ORIGINS) before pushing.
 */
window.APP_CONFIG = {
  apiBase: (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:4000/api"
    : "https://raspect-buildingconditionscore-api.up.railway.app/api"
};
