/**
 * RaSpect Inspectica™ — Shared utilities
 * Reusable helpers used across all pages of the product.
 */
window.RaspectUtils = (() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Format a number as USD currency. Missing/unknown values render as "—"
   *  rather than a misleading "$0" (used for financial estimates that may be
   *  unavailable when public building data is insufficient). */
  function formatCurrency(val, prefix = "$") {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return prefix + Number(val).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  /** Format a number with thousands separators. */
  function formatNumber(val) {
    return Number(val || 0).toLocaleString("en-US");
  }

  /** Clamp a number into a range. */
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /** Correct ordinal suffix: 1 -> 1st, 2 -> 2nd, 3 -> 3rd, 21 -> 21st, 22 -> 22nd ... */
  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /** Escape HTML to prevent XSS when injecting user content. */
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /** Debounce a function call. */
  function debounce(fn, wait = 200) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /** Trigger a DOM download of a Blob (used for CSV export). */
  function downloadFile(filename, content, mime = "text/plain") {
    const blob = new Blob([content], { type: mime + ";charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Convert an array of objects to CSV text. */
  function toCSV(rows, columns) {
    if (!rows.length) return "";
    const cols = columns || Object.keys(rows[0]);
    const escape = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const header = cols.map(escape).join(",");
    const body = rows.map((r) => cols.map((c) => escape(r[c])).join(","));
    return [header, ...body].join("\r\n");
  }

  /** ISO date-time string for a given Date (local). */
  function formatDateTime(d = new Date()) {
    const p = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes())
    );
  }

  /** Short "time ago" string. */
  function timeAgo(isoString) {
    const then = new Date(isoString).getTime();
    if (isNaN(then)) return "";
    const diff = Date.now() - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    const days = Math.floor(hrs / 24);
    if (days < 30) return days + "d ago";
    const months = Math.floor(days / 30);
    return months + "mo ago";
  }

  /** Show a toast notification. */
  function toast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const colors = {
      success: "border-brand-500/40 text-slate-900",
      info: "border-blue-400/40 text-slate-900",
      warning: "border-amber-500/40 text-slate-900",
      error: "border-red-500/50 text-red-700"
    };
    const icons = {
      success: "check-circle-2",
      info: "info",
      warning: "alert-triangle",
      error: "x-circle"
    };
    const el = document.createElement("div");
    el.className =
      "toast glass-panel border " + (colors[type] || colors.success) +
      " text-xs font-bold text-slate-900 flex items-center space-x-2.5 shadow-2xl";
    el.innerHTML =
      '<i data-lucide="' + icons[type] + '" class="w-5 h-5 text-brand-600 flex-shrink-0"></i>' +
      "<span>" + escapeHtml(message) + "</span>";
    container.appendChild(el);
    if (window.lucide) lucide.createIcons({ nodes: [el] });
    requestAnimationFrame(() => el.classList.add("toast-visible"));
    setTimeout(() => {
      el.classList.remove("toast-visible");
      setTimeout(() => el.remove(), 400);
    }, 4200);
  }

  /** Validate an email address. */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  /** Validate a phone number (international, digits + + - spaces). */
  function isValidPhone(phone) {
    return /^\+?[0-9\s\-()]{7,20}$/.test(String(phone || "").trim());
  }

  return {
    $, $$, formatCurrency, formatNumber, ordinal, escapeHtml, clamp,
    debounce, downloadFile, toCSV, formatDateTime, timeAgo,
    toast, isValidEmail, isValidPhone
  };
})();
