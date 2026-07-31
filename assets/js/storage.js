/**
 * RaSpect Inspectica™ — Data layer (repository)
 *
 * This module is the single point of contact for all persisted data in the
 * product (leads, contact messages, analytics events). It exposes a clean,
 * promise-based API surface so that a real backend (REST/GraphQL) can later
 * replace the localStorage implementation WITHOUT touching any page code.
 *
 *   Current implementation : localStorage (client-side only)
 *   Future implementation : fetch() against an API gateway
 */
window.RaspectData = (() => {
  "use strict";

  const NAMESPACE = "raspect.inspectica.v1";

  const KEYS = {
    leads: NAMESPACE + ".leads",
    messages: NAMESPACE + ".messages",
    events: NAMESPACE + ".events"
  };

  /* ------------------------------------------------------------------ *
   * Low-level storage helpers
   * ------------------------------------------------------------------ */

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("[RaspectData] read failed for", key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("[RaspectData] write failed for", key, e);
      return false;
    }
  }

  function uid(prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);
  }

  /* ------------------------------------------------------------------ *
   * Simulated network latency (makes the API feel real + future-proofs
   * for a real backend swap).
   * ------------------------------------------------------------------ */

  function delay(ms = 120) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /* ------------------------------------------------------------------ *
   * LEADS
   * ------------------------------------------------------------------ */

  const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];
  const LEAD_SOURCES = ["Score Tool", "Landing Page", "Contact Form", "Partner", "Referral"];

  async function listLeads() {
    await delay();
    return read(KEYS.leads, []);
  }

  async function createLead(lead) {
    await delay();
    const now = new Date().toISOString();
    const record = {
      id: uid("lead"),
      ...lead,
      status: "New",
      source: lead.source || "Score Tool",
      createdAt: now,
      updatedAt: now
    };
    const all = read(KEYS.leads, []);
    all.unshift(record);
    write(KEYS.leads, all);
    trackEvent("lead_created", { id: record.id, source: record.source, role: record.role });
    return record;
  }

  async function updateLeadStatus(id, status) {
    await delay();
    const all = read(KEYS.leads, []);
    const idx = all.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    all[idx].status = status;
    all[idx].updatedAt = new Date().toISOString();
    write(KEYS.leads, all);
    trackEvent("lead_status_changed", { id, status });
    return all[idx];
  }

  async function deleteLead(id) {
    await delay();
    const all = read(KEYS.leads, []);
    write(KEYS.leads, all.filter((l) => l.id !== id));
    return true;
  }

  async function clearLeads() {
    await delay();
    write(KEYS.leads, []);
    return true;
  }

  /** Seed demo leads so the admin dashboard is not empty on first run. */
  async function seedLeadsIfEmpty() {
    const existing = read(KEYS.leads, []);
    if (existing.length > 0) return existing;
    const now = Date.now();
    const day = 86400000;
    const seeds = [
      {
        name: "Anita Chow", email: "a.chow@greatpeakdev.com", phone: "+852 6123 4567",
        role: "Building Owner / Asset Manager", notes: "Curtain wall inspection for 2 commercial towers in Quarry Bay.",
        building: "100 Queen's Road Central, Hong Kong", score: 38, source: "Score Tool",
        createdAt: new Date(now - 1 * day).toISOString()
      },
      {
        name: "Marcus Lee", email: "marcus.lee@cityprop.fm", phone: "+65 8123 4567",
        role: "Property / Facility Manager", notes: "Interested in portfolio monitoring subscription for 6 assets.",
        building: "Marina One, Singapore", score: 61, source: "Landing Page",
        createdAt: new Date(now - 2 * day).toISOString()
      },
      {
        name: "Sophie Turner", email: "s.turner@wright-eng.co.uk", phone: "+44 7911 123456",
        role: "Structural Engineer / Surveyor", notes: "Post-Grenfell facade compliance inspection for residential block.",
        building: "1 Canada Square, London, UK", score: 47, source: "Partner",
        createdAt: new Date(now - 4 * day).toISOString()
      },
      {
        name: "David Ng", email: "dng@hkia-insurance.com", phone: "+852 9300 1122",
        role: "Insurance / Risk Underwriter", notes: "Wants facade risk data for portfolio underwriting model.",
        building: "350 5th Ave, New York, NY", score: 54, source: "Referral",
        createdAt: new Date(now - 6 * day).toISOString()
      },
      {
        name: "Priya Sharma", email: "priya@harborres.com.au", phone: "+61 412 345 678",
        role: "Building Owner / Asset Manager", notes: "Salt corrosion assessment for harbour-facing residential complex.",
        building: "77 Market St, Sydney, NSW", score: 43, source: "Contact Form",
        createdAt: new Date(now - 9 * day).toISOString()
      }
    ];
    seeds.forEach((s) => {
      s.id = uid("lead");
      s.status = s.id && s.name === "Anita Chow" ? "Contacted" : "New";
      s.updatedAt = s.createdAt;
    });
    write(KEYS.leads, seeds);
    return seeds;
  }

  /* ------------------------------------------------------------------ *
   * CONTACT MESSAGES
   * ------------------------------------------------------------------ */

  async function listMessages() {
    await delay();
    return read(KEYS.messages, []);
  }

  async function createMessage(msg) {
    await delay();
    const record = {
      id: uid("msg"),
      ...msg,
      createdAt: new Date().toISOString()
    };
    const all = read(KEYS.messages, []);
    all.unshift(record);
    write(KEYS.messages, all);
    trackEvent("message_created", { id: record.id });
    return record;
  }

  /* ------------------------------------------------------------------ *
   * ANALYTICS EVENTS (funnel tracking)
   * ------------------------------------------------------------------ */

  async function trackEvent(name, props = {}) {
    const all = read(KEYS.events, []);
    all.push({ name, props, at: new Date().toISOString() });
    // keep a rolling window (max 2000 events)
    if (all.length > 2000) all.splice(0, all.length - 2000);
    write(KEYS.events, all);
  }

  async function listEvents() {
    await delay();
    return read(KEYS.events, []);
  }

  /* ------------------------------------------------------------------ *
   * EXPORTS
   * ------------------------------------------------------------------ */

  const LEAD_COLUMNS = [
    "id", "createdAt", "name", "email", "phone", "role",
    "building", "score", "source", "status", "notes"
  ];

  return {
    LEAD_STATUSES,
    LEAD_SOURCES,
    LEAD_COLUMNS,
    listLeads,
    createLead,
    updateLeadStatus,
    deleteLead,
    clearLeads,
    seedLeadsIfEmpty,
    listMessages,
    createMessage,
    trackEvent,
    listEvents
  };
})();
