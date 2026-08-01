/**
 * RaSpect Inspectica™ — SQLite persistence layer
 *
 * Uses Node's built-in `node:sqlite` (DatabaseSync) — zero native
 * dependencies, ships with Node 24. Schema covers leads, contact messages,
 * and cached building analyses.
 */
const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

function openDb(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new DatabaseSync(filePath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL,
      phone       TEXT,
      role        TEXT,
      building    TEXT,
      building_id TEXT,
      score       INTEGER,
      safety      INTEGER,
      serviceability INTEGER,
      sustainability INTEGER,
      financial   TEXT,
      source      TEXT DEFAULT 'Score Tool',
      status      TEXT DEFAULT 'New',
      notes       TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      company    TEXT,
      topic      TEXT,
      message    TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id           TEXT PRIMARY KEY,
      address      TEXT NOT NULL,
      lat          REAL,
      lon          REAL,
      building     TEXT,
      score        TEXT,
      financial    TEXT,
      kris         TEXT,
      created_at   TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_analyses_address ON analyses(address);
  `);

  return db;
}

function uid(prefix) {
  return (prefix || "id") + "-" + Date.now().toString(36) + "-" +
    Math.random().toString(36).slice(2, 8);
}

module.exports = { openDb, uid };
