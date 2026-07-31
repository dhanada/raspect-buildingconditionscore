# BuildingConditionScore — RaSpect Inspectica™ Intelligence

A production-structured, multi-page lead-generation web product for RaSpect's **BuildingConditionScore** — an AI-powered diagnostic that generates building envelope risk scores for any address.

Built as a **static, self-contained web app** (no build step, no backend required) with a **backend-ready data layer**, so it can be deployed to any static host today and connected to a real CRM/API later.

---

## Pages

| Page | Route | Purpose |
|---|---|---|
| Landing | `index.html` | Marketing homepage — value prop, features, testimonials, CTAs |
| Score Tool | `score.html` | The core diagnostic: address search → BuildingConditionScore, KRIs, financial risk, peer benchmarking, drone-vs-manual simulator, lead capture |
| Leads Admin | `leads.html` | Back office — view, filter, status-manage, and CSV-export captured leads |
| Methodology | `methodology.html` | Explains the scoring model (Safety 40 / Serviceability 35 / Sustainability 25) |
| Contact | `contact.html` | Contact form that persists messages alongside leads |

---

## Tech Stack

- **HTML5 + Tailwind CSS** (vendored play CDN — see *Upgrade note* below)
- **Alpine.js** for interactivity (vendored)
- **Chart.js** for the gauge & peer-benchmark charts (vendored)
- **Lucide** for icons (vendored)
- **localStorage** as the persistence layer behind a clean repository abstraction

All vendor libraries are stored locally in `vendor/` so the product runs fully offline and self-contained — no CDN at runtime.

---

## Running locally

A PowerShell static file server is included (`serve.ps1`) because this machine has neither Node nor Python:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8099
# → http://localhost:8099/
```

You can also just open the HTML files directly, or deploy the folder to **GitHub Pages**, **Netlify**, **Vercel**, **Azure Static Web Apps**, or any web server.

---

## Project structure

```
RaSpect/
├── index.html            # Landing page
├── score.html            # BuildingConditionScore tool
├── leads.html            # Admin lead dashboard
├── methodology.html      # Methodology page
├── contact.html          # Contact page
├── serve.ps1             # Local static server (PowerShell)
├── assets/
│   ├── css/styles.css    # Shared design system & components
│   ├── img/*.svg         # Local building illustrations (self-contained)
│   └── js/
│       ├── components.js # Shared nav + footer injection
│       ├── storage.js    # ★ Data layer (localStorage repository)
│       └── utils.js      # Helpers (currency, CSV, ordinal, toasts…)
├── data/
│   └── buildings.js      # Sample asset presets
└── vendor/               # Vendored libs (tailwind, alpine, chart, lucide)
```

---

## Data layer & future backend

All persistence flows through **`assets/js/storage.js`** (`window.RaspectData`), which exposes a promise-based repository API:

```js
RaspectData.createLead({...})   // save a lead
RaspectData.listLeads()         // list leads
RaspectData.updateLeadStatus(id, status)
RaspectData.deleteLead(id)
RaspectData.clearLeads()
RaspectData.createMessage({...}) // contact form
RaspectData.trackEvent(name, props) // funnel analytics
```

To go full-stack later, replace the localStorage implementation inside `storage.js` with `fetch()` calls to your API — **no page code changes required**.

### Lead data model

| Field | Description |
|---|---|
| `id` | Unique id |
| `name`, `email`, `phone` | Contact details |
| `role` | Owner / FM / Engineer / Insurer |
| `building` | Address the score was generated for |
| `score` | BuildingConditionScore at capture time |
| `source` | Score Tool / Landing / Contact / Partner / Referral |
| `status` | New → Contacted → Qualified → Proposal → Won / Lost |
| `createdAt` / `updatedAt` | ISO timestamps |

---

## Improvements over the original prototype

- ✅ **Fixed** lead-modal viewport overflow (unclickable submit on small screens)
- ✅ **Fixed** ordinal suffix bug ("32th" → "32nd")
- ✅ **Fixed** broken cross-origin images (replaced with local SVG illustrations)
- ✅ **Removed** runtime CDN reliance — libraries vendored locally
- ✅ **Real persistence** — leads & messages saved to localStorage (were lost before)
- ✅ **Form validation** — email/phone/required-field checks with inline errors
- ✅ **Printable executive report** — clean print layout replacing the bare `window.print()` hack
- ✅ **Multi-page product structure** with shared nav/footer
- ✅ **Admin dashboard** — filter, status workflow, delete, CSV export
- ✅ **Accessibility** — labels, roles, aria labels on icon-only buttons
- ✅ **Funnel analytics** — `trackEvent` on landing/view/generate/lead events

---

## Known notes

- **Tailwind console warning** — the vendored play-CDN still logs a "not for production" warning. It's cosmetic. To remove it, compile Tailwind to a static CSS file using the Tailwind CLI (needs Node/npm) and replace `vendor/tailwind.js` with a `<link>` to the compiled stylesheet.
- **Sample data** — building scores are demo-generated. Wire the `RaspectData` layer to a real scoring API for production values.
- **Demo seed** — the Leads Admin seeds 5 sample leads on first run so the dashboard isn't empty.
