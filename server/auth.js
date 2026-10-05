/**
 * Admin authentication middleware.
 *
 * Protects PII-bearing admin endpoints (listing/managing leads, reading contact
 * messages). The caller must present the token configured via ADMIN_TOKEN in
 * either the `X-Admin-Token` header or an `Authorization: Bearer <token>` header.
 *
 * - If ADMIN_TOKEN is not set, admin endpoints fail closed with 503 so an
 *   operator cannot accidentally expose PII without configuring a token.
 * - Public capture endpoints (POST /api/leads, POST /api/messages, /api/score)
 *   deliberately do NOT use this middleware.
 */
function requireAdmin(req, res, next) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return res.status(503).json({ error: "Admin API is not configured — set ADMIN_TOKEN in the environment" });
  }

  const header = req.headers["x-admin-token"];
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const provided = header || bearer;

  if (!provided || provided !== token) {
    return res.status(401).json({ error: "Unauthorized — a valid admin token is required" });
  }
  next();
}

module.exports = { requireAdmin };
