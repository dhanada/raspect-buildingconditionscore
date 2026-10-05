/**
 * Lead routes — capture, list, update, delete leads.
 */
const express = require("express");
const router = express.Router();

const { uid } = require("../db");
const { requireAdmin } = require("../auth");

const VALID_STATUSES = new Set(["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"]);

module.exports = function leadRoutes(db) {
  const rowToLead = (r) => r && ({
    id: r.id, name: r.name, email: r.email, phone: r.phone, role: r.role,
    building: r.building, score: r.score, safety: r.safety,
    serviceability: r.serviceability, sustainability: r.sustainability,
    financial: r.financial ? JSON.parse(r.financial) : null,
    source: r.source, status: r.status, notes: r.notes,
    createdAt: r.created_at, updatedAt: r.updated_at
  });

  /** GET /api/leads — list all leads (newest first). Requires admin token. */
  router.get("/", requireAdmin, (req, res) => {
    const rows = db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
    res.json(rows.map(rowToLead));
  });

  /** GET /api/leads/stats — aggregate stats for the admin dashboard. Requires admin token. */
  router.get("/stats", requireAdmin, (req, res) => {
    const total = db.prepare("SELECT COUNT(*) c FROM leads").get().c;
    const fresh = db.prepare("SELECT COUNT(*) c FROM leads WHERE status = 'New'").get().c;
    const won = db.prepare("SELECT COUNT(*) c FROM leads WHERE status IN ('Qualified','Won')").get().c;
    const avg = db.prepare("SELECT AVG(score) a FROM leads WHERE score IS NOT NULL").get().a;
    res.json({ total, new: fresh, won, avgScore: avg ? Math.round(avg) : null });
  });

  /**
   * POST /api/leads — capture a lead. Optionally attach an analysis payload
   * so the building, sub-scores and financials are stored with the lead.
   */
  router.post("/", (req, res) => {
    const b = req.body || {};
    const name = (b.name || "").trim();
    const email = (b.email || "").trim().toLowerCase();
    if (!name || !email) return res.status(400).json({ error: "Name and email are required" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Invalid email" });

    const now = new Date().toISOString();
    const id = uid("lead");
    const score = b.score != null ? b.score : null; // keep a legitimate 0
    const sub = b.subScores || {};

    db.prepare(
      `INSERT INTO leads (id, name, email, phone, role, building, score, safety, serviceability, sustainability, financial, source, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, name, email, b.phone || null, b.role || null, b.building || null,
      score, sub.safety || null, sub.serviceability || null, sub.sustainability || null,
      b.financial ? JSON.stringify(b.financial) : null,
      b.source || "Score Tool", b.status || "New", b.notes || null, now, now
    );

    res.status(201).json(rowToLead(db.prepare("SELECT * FROM leads WHERE id = ?").get(id)));
  });

  /** PATCH /api/leads/:id — update status (and/or notes). Requires admin token. */
  router.patch("/:id", requireAdmin, (req, res) => {
    const existing = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Lead not found" });

    const status = req.body.status || existing.status;
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid status — expected one of: " + [...VALID_STATUSES].join(", ") });
    }
    const notes = req.body.notes !== undefined ? req.body.notes : existing.notes;
    const now = new Date().toISOString();

    db.prepare("UPDATE leads SET status = ?, notes = ?, updated_at = ? WHERE id = ?")
      .run(status, notes, now, req.params.id);

    res.json(rowToLead(db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id)));
  });

  /** DELETE /api/leads/:id — requires admin token. */
  router.delete("/:id", requireAdmin, (req, res) => {
    const result = db.prepare("DELETE FROM leads WHERE id = ?").run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: "Lead not found" });
    res.json({ ok: true });
  });

  /** DELETE /api/leads — clear all. Requires admin token. */
  router.delete("/", requireAdmin, (req, res) => {
    db.prepare("DELETE FROM leads").run();
    res.json({ ok: true });
  });

  return router;
};
