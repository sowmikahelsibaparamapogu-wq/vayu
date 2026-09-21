# CycloneGuard 🌀
### AI-Powered Tropical Cyclone Impact Zone Forecasting & Infrastructure Vulnerability Scoring System

> **Designed for State & National Disaster Management Authorities (SDMA / NDMA)**  
> Prioritize pre-landfall civilian evacuation, emergency generator pre-positioning, and critical lifeline hardening before landfall.

---

## 🎯 The Core Problem Solved

Standard meteorological forecasts (from IMD, JTWC, NOAA) predict **where the cyclone goes** (track, eye coordinates, barometric minimum).  
However, they **do not tell emergency commanders what gets hurt**.

A tertiary hospital 2 km from the projected eyewall with ground-floor oxygen manifolds and no backup generator represents a catastrophic casualty risk, whereas an elevated stilted warehouse in the same zone requires no evacuation. **CycloneGuard bridges this operational gap** by combining:
1. Dynamic forecast uncertainty cone projection (24h / 48h / 72h horizons)
2. Radial wind decay modeling (Holland 1980 vortex equations)
3. Hydrodynamic storm surge inundation modeling against high-resolution SRTM elevation
4. Multi-criteria critical infrastructure vulnerability scoring (Hospitals, Power Substations, Designated Shelters, Road Evacuation Corridors, Telecom Towers, Water Plants)
5. Actionable pre-landfall tactical directives for incident commanders

---

## 🌟 Visual Design & UX Philosophy

Built specifically as a **high-confidence emergency operations center application**:
- **Ocean / Cyclone Palette:** Deep ocean navy (`#0B5FA5`, `#0C4A8A`) for navigational structure, sky/teal accents (`#3FA9E0`, `#5ED4D2`), floating cards with soft blue-tinted shadows over a bright, clean `#F5FAFF` canvas (no generic dark-mode SaaS clichés).
- **High-Contrast Risk Tiers:** Critical = Coral Red (`#EF4444`), High = Amber Orange (`#F97316`), Medium = Warm Gold (`#EAB308`), Low = Teal Green (`#14B8A6`).
- **CartoDB Positron Basemap:** Light, crisp cartography highlighting coastal topography and estuarine features.
- **Interactive Map Layers:** 72h forecast cone polygon, storm center track with 12h/24h/48h milestones, pulsing eye of cyclone with radar sweep animation, color-coded infrastructure markers.

---

## 🧮 Mathematical & Vulnerability Models

### 1. Composite Vulnerability Formulation
$$\text{Vulnerability} = 0.40 \times \text{Hazard Exposure} + 0.35 \times \text{Asset Criticality} + 0.25 \times \text{Structural Fragility}$$

### 2. Holland Wind Field Radial Decay Model
$$V(r) = V_{\max} \cdot \left[ \left(\frac{R_{\max}}{r}\right)^B \cdot \exp\left(1 - \left(\frac{R_{\max}}{r}\right)^B\right) \right]^{0.5}$$
- $R_{\max} \approx 32 - 45\text{ km}$ (Radius of maximum winds)
- $B \approx 1.25$ (Holland shape parameter)
- $r$: Geodesic Haversine perpendicular distance from asset coordinates to the cyclone track

### 3. Storm Surge Inundation Depth
$$\text{Surge}_{\text{peak}} = 0.048 \times (1013 - P_{\text{central}})\quad [\text{meters}]$$
$$\text{Surge}_{\text{local}}(d) = \text{Surge}_{\text{peak}} \times \exp(-0.28 \times d_{\text{coast}})$$
$$\text{Net Inundation Depth} = \max(0, \text{Surge}_{\text{local}} - \text{Elevation}_{\text{AMSL}})$$

### 4. Structural Fragility Penalties
- Missing backup generator: $+22$ points
- Limited backup fuel ($<24$h): $+10$ points
- No flood barrier / seawall: $+16$ points
- Unreinforced masonry structure: $+35$ points
- Guyed steel lattice telecom tower: $+30$ points
- Low-lying profile ($<4$m AMSL, $<3$km coast): $+15$ points

---

## 🚀 API Endpoints

- `GET /api/cyclones` — Lists historical and active Indian Ocean cyclone scenarios (Cyclone Fani, Cyclone Michaung, Cyclone Amphan)
- `POST /api/cyclones/forecast` — Generates 72-hour forecast uncertainty cone geometry and track points from storm parameters
- `GET /api/infrastructure` — Geospatial retrieval of hospitals, power stations, shelters, and roads (supports bbox & district filters)
- `POST /api/vulnerability/score` — Intersects cyclone track with infrastructure to return ranked vulnerability scores and tactical directives
- `GET /api/vulnerability/summary` — District-level rollup statistics (population at risk, tier distributions)
- `POST /api/ai-briefing` — Generates executive emergency command briefings for state disaster commissioners (Gemini 2.5 Flash / Deterministic fallback)

---

## 💻 Tech Stack & Deployment

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Leaflet, Recharts, Lucide Icons, Motion
- **Full-Stack Runtime:** Express.js + Vite integration with TypeScript execution on Port 3000
- **Alternative Python Backend:** FastAPI, Uvicorn, GeoPandas, Shapely, NumPy, Pandas (provided in `cycloneguard/backend/`)
- **Containerization:** Docker Compose for local multi-service orchestration
- **Cloud Deploy Target:** Render / Railway (backend API) + Vercel / Cloud Run (web application)

---

## 🛠️ Local Development

### Option A: Standard Full-Stack (Default)
```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build production bundle
npm run build
```

### Option B: Docker Compose
```bash
docker-compose up --build
```
Open [http://localhost:3000](http://localhost:3000) to launch CycloneGuard.
