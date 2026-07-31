/**
 * RaSpect Inspectica™ — Shared site components (nav + footer)
 * Injects the site header and footer into placeholder elements so all pages
 * stay consistent without duplicating HTML.
 */
(function () {
  "use strict";

  const BRAND =
    '<a href="index.html" class="flex items-center space-x-3.5 group">' +
    '  <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-400 p-0.5 flex items-center justify-center shadow-md shadow-brand-600/20 transition-transform group-hover:scale-105">' +
    '    <div class="w-full h-full bg-white rounded-[10px] flex items-center justify-center">' +
    '      <i data-lucide="shield-alert" class="w-5 h-5 text-brand-600"></i>' +
    "    </div>" +
    "  </div>" +
    '  <div class="text-left">' +
    '    <span class="font-black text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-brand-700 bg-clip-text text-transparent block">BuildingConditionScore</span>' +
    '    <span class="text-[10px] text-slate-500 block">by RaSpect Inspectica™ AI</span>' +
    "  </div>" +
    "</a>";

  const NAV_LINKS = [
    { href: "index.html", label: "Home", key: "home" },
    { href: "score.html", label: "Score Tool", key: "score" },
    { href: "methodology.html", label: "Methodology", key: "methodology" },
    { href: "contact.html", label: "Contact", key: "contact" },
    { href: "leads.html", label: "Leads Admin", key: "leads" }
  ];

  function buildNav(activeKey) {
    const links = NAV_LINKS.map((l) =>
      '<a href="' + l.href + '" class="nav-link text-sm px-3 py-2 rounded-xl ' +
      (l.key === activeKey ? "active" : "") + '">' + l.label + "</a>"
    ).join("");

    const mobileLinks = NAV_LINKS.map((l) =>
      '<a href="' + l.href + '" class="nav-link block px-4 py-3 text-sm ' +
      (l.key === activeKey ? "active" : "") + '">' + l.label + "</a>"
    ).join("");

    return (
      '<header class="site-nav sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 shadow-sm no-print">' +
      '  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">' +
      BRAND +
      '    <nav class="hidden md:flex items-center space-x-1">' + links +
      '      <a href="score.html" class="btn-cta text-xs px-4 py-2.5 flex items-center space-x-2 ml-2">' +
      '        <i data-lucide="send" class="w-4 h-4"></i><span>Book Drone Scan</span>' +
      "      </a>" +
      "    </nav>" +
      '    <div class="flex items-center space-x-3">' +
      '      <button @click="mobileOpen = !mobileOpen" class="md:hidden p-2 rounded-xl hover:bg-slate-100 border border-slate-200" aria-label="Toggle menu">' +
      '        <i data-lucide="menu" class="w-5 h-5 text-slate-600"></i>' +
      "      </button>" +
      "    </div>" +
      "  </div>" +
      // Mobile drawer
      '<div x-show="mobileOpen" x-cloak x-transition class="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur">' +
      '  <nav class="py-2">' + mobileLinks + "</nav>" +
      "</div>" +
      "</header>"
    );
  }

  function buildFooter() {
    return (
      '<footer class="site-footer mt-auto border-t border-slate-200/80 glass-panel py-8 text-xs text-slate-500 no-print">' +
      '  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">' +
      '    <div class="flex flex-col sm:flex-row items-center justify-between gap-6">' +
      '      <div class="flex items-center space-x-2">' +
      '        <span class="font-bold text-slate-800">BuildingConditionScore</span>' +
      "        <span>— Powered by</span>" +
      '        <span class="text-brand-700 font-bold">RaSpect Inspectica™ AI</span>' +
      "      </div>" +
      '      <div class="flex items-center space-x-5">' +
      '        <a href="methodology.html" class="hover:text-brand-700">Methodology</a>' +
      '        <a href="contact.html" class="hover:text-brand-700">Contact</a>' +
      '        <a href="leads.html" class="hover:text-brand-700">Admin</a>' +
      "      </div>" +
      "    </div>" +
      '    <div class="text-center mt-4">© 2026 RaSpect Intelligence Ltd. All rights reserved.</div>' +
      "  </div>" +
      "</footer>"
    );
  }

  window.RaspectComponents = {
    mount(activeKey) {
      const navSlot = document.getElementById("site-nav");
      const footerSlot = document.getElementById("site-footer");
      const toastSlot = document.getElementById("toast-container");
      if (navSlot) navSlot.innerHTML = buildNav(activeKey);
      if (footerSlot) footerSlot.innerHTML = buildFooter();
      if (toastSlot && !toastSlot.innerHTML.trim()) {
        toastSlot.innerHTML = ""; // placeholder already exists as empty container
      }
      if (window.lucide) lucide.createIcons();
      return { activeKey };
    }
  };
})();
