# BuildingConditionScore — RaSpect Inspectica™ Intelligence

A production-structured, multi-page **lead-generation web product** for RaSpect's **BuildingConditionScore** — an AI-powered diagnostic that generates building envelope risk scores for any address.

**Full-stack:** static frontend (GitHub Pages) + a **Node.js/Express API** that computes scores from **real public data** (OpenStreetMap/Nominatim + Open-Meteo) with **SQLite** persistence for leads, messages and analyses.

---

## Pages

| Page | Route | Purpose |
|---|---|---|
| Landing | `index.html` | Marketing homepage — value prop, features, testimonials, CTAs |
| Score Tool | `score.html` | Real-data diagnostics: footprint map, building attributes, climate, score, KRIs, financial risk, lead capture |
| Leads Admin | `leads.html` | Back office — view, filter, status-manage, and CSV-export captured leads |
| Methodology | `methodology.html` | Explains the transparent scoring model (Safety 40 / Serviceability 35 / Sustainability 25) |
| Contact | `contact.html` | Contact form persisted to the backend |

---

## Tech Stack

**Frontend (static — GitHub Pages):**
- HTML5 + Tailwind CSS, Alpine.js, Chart.js, Lucide, **Leaflet** (all vendored in `vendor/` — no runtime CDN)
- Config: `assets/js/config.js` (`window.APP_CONFIG.apiBase`) is the single place the site learns the API URL

**Backend (`server/` — Node 24 + Express):**
- **SQLite** via Node's built-in `node:sqlite` (zero native deps)
- **Nominatim** (OSM) geocoding — address → coordinates
- **Overpass** (OSM) — real building footprints, height, levels, materials, age
- **Open-Meteo** — 12 months of wind / temperature / precipitation
- Transparent scoring engine (`server/scoring.js`) — every penalty itemised, data gaps reported honestly

---

## Running locally

1. Start the backend:
```powershell
cd server
npm install
copy .env.example .env     # adjust if needed
node index.js              # → http://localhost:4000/api
```
2. Serve the frontend (PowerShell static server):
```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8099
# → http://localhost:8099/
```

The frontend auto-detects `localhost` and calls `http://localhost:4000/api`. If the backend is offline, the site gracefully falls back to demo data and shows a "Demo mode" notice.

---

## API

| Method | Route | Purpose |
|---|---|---|
| `GET`  | `/api/health` | Health check |
| `POST` | `/api/score` | `{ address }` → geocode + building data + climate + score (real) |
| `GET`  | `/api/score/:id` | Retrieve a stored analysis |
| `GET`  | `/api/leads` | List leads |
| `POST` | `/api/leads` | Capture a lead (name, email, building, score, sub-scores…) |
| `PATCH`| `/api/leads/:id` | Update status / notes |
| `DELETE` | `/api/leads` · `/api/leads/:id` | Clear / delete leads |
| `GET`/`POST` | `/api/messages` | Contact messages |

---

## Deploying

**Frontend → GitHub Pages:** already automated via `.github/workflows/pages.yml` (push to `main`).

**Backend → free cloud host** (choose one):

### Option A — Railway
1. Create a project at [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → select this repo.
2. Set env vars: `CORS_ORIGINS=https://dhanada.github.io` (or your URL), `SQLITE_PATH=/data/raspect.db`.
3. Add a **Volume** mounted at `/data` (so SQLite data survives redeploys).
4. Copy the generated URL (e.g. `https://raspect-api.up.railway.app`) into `assets/js/config.js` as `apiBase`, commit & push.

### Option B — Render
1. In [render.com](https://render.com) → **New** → **Blueprint** → select this repo (`render.yaml` is picked up automatically).
2. `render.yaml` already wires the Dockerfile, health check, env vars and a **1 GB persistent disk** at `/var/data`.
3. Set `CORS_ORIGINS` to your frontend URL, copy the service URL into `assets/js/config.js`, commit & push.

> **CORS:** the backend only allows the origins listed in `CORS_ORIGINS`. Add every frontend URL you use (localhost + GitHub Pages + custom domain).


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
