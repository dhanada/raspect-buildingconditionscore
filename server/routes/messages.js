/**
 * Contact message routes.
 */
const express = require("express");
const router = express.Router();

const { uid } = require("../db");

module.exports = function messageRoutes(db) {
  /** GET /api/messages — list contact messages. */
  router.get("/", (req, res) => {
    const rows = db.prepare("SELECT * FROM messages ORDER BY created_at DESC").all();
    res.json(rows);
  });

  /** POST /api/messages */
  router.post("/", (req, res) => {
    const b = req.body || {};
    const name = (b.name || "").trim();
    const email = (b.email || "").trim().toLowerCase();
    const message = (b.message || "").trim();
    if (!name || !email || !message) return res.status(400).json({ error: "Name, email and message are required" });

    const now = new Date().toISOString();
    const id = uid("msg");
    db.prepare(
      "INSERT INTO messages (id, name, email, company, topic, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, name, email, b.company || null, b.topic || null, message, now);

    res.status(201).json(db.prepare("SELECT * FROM messages WHERE id = ?").get(id));
  });

  return router;
};
