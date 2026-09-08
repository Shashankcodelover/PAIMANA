# PAIMANA Risk Watch

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/Shashankcodelover/PAIMANA)
[![Python](https://img.shields.io/badge/Python-3.9+-green)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB)](https://react.dev/)

An AI-powered early-warning system that predicts cost and time overrun risk for Indian
central-government infrastructure projects, built on MoSPI's PAIMANA project-monitoring data.
Built as a one-day hackathon MVP for Smart India Hackathon, PS 26103.

Every prediction the API returns comes from a real, trained model run live against the loaded
dataset — never a hardcoded or random number. See "How to independently verify" below.

## Which data path was used

**Seed-fallback path (Section 12 of the build brief), not live PDF extraction.** This build ran in an
environment with no internet access, so `data/extract.py` (live MoSPI Flash Report PDF extraction)
could not be attempted at all — there was no PDF to fetch. Per the brief's own instruction ("if you're
pasting this into a sandboxed chat environment without live internet access, say so up front... skip
straight to Section 5's fallback path"), the build went directly to `data/seed_data.py`.

`data/seed_data.py` generates a synthetic-but-honestly-labeled dataset (254 rows across 22 sectors and
20 ministries) statistically anchored to real, published MoSPI aggregate figures — see the sector
overrun-mean table inside that file. Five real, named, individually-verifiable projects (Polavaram
Irrigation Project, BharatNet, Western Dedicated Freight Corridor, Mumbai–Ahmedabad High Speed Rail,
Ken-Betwa Linking Project) are hardcoded exactly, not sampled, with their real published cost figures.

`data/extract.py` and `data/clean.py` (the live-extraction path) are included complete and ready to
run — see "Swapping in live data" below — but were not exercised in this build.

Every generated row carries honest flags: `date_is_synthetic=true` on all seed rows (no real dates
exist in this fallback path), `cost_is_estimated=true` on every sampled row (`false` on the five real
hardcoded projects), `revised_cost_missing=true` wherever a revised cost hasn't "been reported" yet,
and `possible_outlier=true` wherever `cost_overrun_pct` exceeds 500%.

## Folder structure

```
paimana-risk-watch/
├── README.md
├── .gitignore
├── docs/
│   ├── CONTRACT.md          # the exact data schema used everywhere in the system
│   └── FINDINGS.md          # baseline-vs-ML + ablation study results, plain English
├── data/
│   ├── extract.py           # live MoSPI PDF extraction (not run in this build — no internet)
│   ├── clean.py              # raw -> clean CSV (not run in this build)
│   ├── seed_data.py          # fallback generator — ACTUALLY USED to produce projects_clean.csv
│   ├── projects_raw.csv      # generated (live path only)
│   └── projects_clean.csv    # generated — the dataset the whole system runs on
├── ml/
│   ├── eda.py                 # exploratory analysis + plots
│   ├── baseline.py            # linear regression baseline
│   ├── model.py                # XGBoost (RandomForest fallback) regressor + classifier
│   ├── ablation.py             # CUF-only vs CUF+engineered features study
│   ├── predictor.py            # predict_risk() — the ONE function the backend calls
│   ├── plots/                  # generated PNGs from eda.py
│   └── models/                  # generated .joblib model files + metadata.json
├── backend/
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── render.yaml
│   └── app/
│       ├── main.py             # FastAPI entrypoint, CORS, static frontend serving
│       ├── models.py           # Pydantic models matching docs/CONTRACT.md
│       ├── mock_data.py        # ~30 mock projects, used only if the CSV is missing
│       ├── data/loader.py      # loads CSV, caches predictions at startup
│       └── routers/
│           ├── projects.py     # GET /api/projects, GET /api/projects/{id}
│           ├── stats.py        # GET /api/stats/overview, GET /api/stats/by-sector
│           ├── predict.py      # POST /api/predict — the live what-if endpoint
│           └── alerts.py       # GET /api/alerts
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── .env.example
    └── src/
        ├── main.jsx, App.jsx, styles.css, api.js
        └── components/
            ├── Hero.jsx           # count-up hero stat
            ├── SectorBars.jsx     # horizontal risk bars by sector
            ├── ProjectTable.jsx    # searchable/filterable project list
            └── DetailPanel.jsx     # slide-over detail + live what-if slider
```

## How to run the backend locally

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt
cd ..
python3 -m uvicorn app.main:app --reload --port 8000 --app-dir backend
```

Or, from inside `backend/`:

```bash
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

If `data/projects_clean.csv` doesn't exist yet, the backend falls back to `mock_data.py` automatically
and prints a warning — it will never crash on a missing CSV. Run the data/ML pipeline below to get real
predictions instead of the mock fallback.

## How to run the frontend locally

```bash
cd frontend
npm install
cp .env.example .env   # only needed if your backend isn't on localhost:8000
npm run dev
```

Opens at `http://localhost:5173`, calling the backend at `VITE_API_URL` (defaults to
`http://localhost:8000`).

## How to run the data extraction / cleaning / ML pipeline from scratch

This build used the seed-fallback path. To regenerate everything from scratch:

```bash
# 1. Generate the dataset (seed-fallback path — always works, no internet needed)
python3 data/seed_data.py

# --- OR, if you have internet access and want to try the live path instead ---
# python3 data/extract.py --url https://ipm.mospi.gov.in/Content/PDF/FlashReport_<Month>_<Year>.pdf
# python3 data/clean.py

# 2. Run the ML pipeline, in order, from the ml/ directory
cd ml
python3 eda.py                       # writes plots/ + prints summary stats
PYTHONPATH=. python3 model.py        # trains regressor + classifier, prints baseline comparison,
                                      # saves models/ + metadata.json (also runs baseline.py internally)
python3 ablation.py                   # prints the CUF-only vs CUF+engineered comparison
python3 predictor.py                  # sanity check: prints predictions for two example projects
cd ..
```

Then restart the backend — `backend/app/data/loader.py` picks up the new CSV and models automatically
on the next startup (predictions are cached once at startup, not recomputed per request).

## Swapping in live data

Once you have internet access:

```bash
python3 data/extract.py --url https://ipm.mospi.gov.in/Content/PDF/FlashReport_<Month>_<Year>.pdf
python3 data/clean.py
```

(also check `https://www.mospi.gov.in/uploads/release_calendar/` for the current filename if the URL
pattern above 404s — MoSPI occasionally changes the exact path). Then re-run the ML pipeline as above.

## How to deploy

Single service, one Dockerfile, serves both the built frontend and the JSON API from one origin.

```bash
docker build -t paimana-risk-watch -f backend/Dockerfile .
docker run -p 8000:8000 paimana-risk-watch
```

Or deploy directly to Render/Railway using `backend/render.yaml` (Render: New → Blueprint → point at
this repo; it reads `render.yaml` automatically).

**Verify the deployed link actually serves the frontend, not the raw JSON API**, by opening the public
URL fresh in an incognito window (ideally on a phone on mobile data, not team wifi) and confirming the
dashboard renders — not a `{"message": ...}` JSON blob.

**Free-tier hosts sleep after ~15 minutes idle** and take 30–60s to wake back up on the next request.
Warm the link up a few minutes before any live demo by hitting `GET /api/health` once.

## curl test commands for every endpoint

```bash
# Health check
curl http://localhost:8000/api/health

# List all projects
curl http://localhost:8000/api/projects

# Filter projects (combinable, case-insensitive)
curl "http://localhost:8000/api/projects?sector=Water%20Resources&risk_category=Critical"

# Get one project (404 case)
curl http://localhost:8000/api/projects/does-not-exist

# Get one real project (200 case — use an ID from the list above, e.g. Polavaram)
curl http://localhost:8000/api/projects/701415

# Overview stats
curl http://localhost:8000/api/stats/overview

# Per-sector stats
curl http://localhost:8000/api/stats/by-sector

# High/Critical alerts, sorted by risk score
curl http://localhost:8000/api/alerts

# Live prediction (the what-if slider hits this)
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"original_cost_cr": 10151, "sector": "Water Resources", "ministry": "Ministry of Jal Shakti", "physical_progress_pct": 72, "additional_delay_months": 6}'
```

## Assumptions Made

Logged here per the build brief's instruction to make sensible calls and keep moving rather than stop
and ask:

1. **No internet access in this build environment** → went straight to the seed-fallback data path
   (Section 12) rather than attempting live PDF extraction, per the brief's own explicit instruction
   for this scenario.
2. **Seed dataset size** — the brief's own per-sector project-count table (e.g. Roads & Highways:
   1,108) sums to well over the brief's stated "~200–300 rows" target if taken literally. Scaled every
   sector's real project count down by a fixed factor of 8 (documented in `data/seed_data.py`) to land
   at 254 rows while preserving each sector's real, anchored mean overrun % and relative portfolio
   share.
3. **The 12 "other" PAIMANA sectors** not individually anchored in the brief's table were filled in
   with real MoSPI-tracked sector names (Civil Aviation, Ports/Shipping/Waterways, Petroleum & Natural
   Gas, Coal, Steel, Fertilizers, Rural Development, Housing & Urban Affairs, Atomic Energy, Renewable
   Energy, Tourism, Agriculture & Farmers Welfare) with a mean overrun % sampled uniformly in [5%,
   35%] per the brief's own instruction for this case, and flagged in code comments as less precisely
   anchored than the ten named sectors.
4. **xgboost unavailable** in this build environment (no internet to `pip install` it) → used the
   documented `RandomForestRegressor`/`Classifier` fallback throughout. No code changes needed to
   switch to real xgboost once it's installable — `ml/model.py` and `ml/ablation.py` both try the
   `xgboost` import first and only fall back on `ImportError`.
5. **`predicted_time_overrun_days`** — the seed dataset has no ground-truth "actual schedule slip in
   days" column to train a separate model on, so this field is derived transparently from the
   regressor's `cost_overrun_pct` output (documented ~6 days of schedule slip per 1% of cost overrun,
   floored at 0) rather than a second trained model. This is disclosed in `ml/predictor.py`, not
   presented as an independently validated prediction.
6. **`top_risk_factors`** uses each row's activated one-hot features weighted by the regressor's
   global `feature_importances_` as a lightweight, dependency-free per-row explainer — documented in
   `ml/predictor.py` as a reasonable stand-in for a full SHAP explainer at hackathon scope, not sold as
   true SHAP.
7. **What-if slider's `additional_delay_months`** is folded in as an explicit, documented
   post-processing adjustment on top of the model's own output (extra days added directly,
   `risk_score` nudged and re-bucketed using the same thresholds the base prediction uses) rather than
   a second hidden model, so the "every prediction comes from a real trained model" guarantee stays
   intact and auditable.
8. **Risk category thresholds** (Low <10%, Medium 10–25%, High 25–50%, Critical >50%) were kept as
   given in the brief — the seed dataset's real distribution (median overrun ~7%, most projects under
   20%, a long tail to 447%) makes these thresholds reasonable as-is, so no adjustment was needed.
9. **Ministry names** for the 22 sectors were assigned via a best-effort real-world sector→ministry
   mapping (e.g. Water Resources → Ministry of Jal Shakti, Railways → Ministry of Railways) rather than
   sourced per-row from a report, since the seed path has no per-row ministry field to draw from.

## Demo instructions

### Starting everything locally from a clean clone

```bash
git clone <this-repo>
cd paimana-risk-watch

# Data + ML (only needed once, or after changing the pipeline)
python3 data/seed_data.py
cd ml && PYTHONPATH=. python3 model.py && python3 ablation.py && cd ..

# Backend (terminal 1)
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# Frontend (terminal 2)
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173`.

### How the what-if slider demonstrates a live model call

Click path: open any **High**-risk project (e.g. search "Polavaram" or "BharatNet") → the slide-over
panel opens → drag the "additional delay (months)" slider → watch the risk score number and the
risk-category badge both animate to new values in real time. Each drag (debounced ~300ms) fires a
`POST /api/predict` with the project's real features plus the slider's delay value — the number on
screen is never computed client-side.

### How to independently verify a prediction isn't hardcoded

Pick two projects with different `original_cost_cr` and `sector` and call the API directly:

```bash
curl -X POST http://localhost:8000/api/predict -H "Content-Type: application/json" \
  -d '{"original_cost_cr": 10151, "sector": "Water Resources", "ministry": "Ministry of Jal Shakti"}'

curl -X POST http://localhost:8000/api/predict -H "Content-Type: application/json" \
  -d '{"original_cost_cr": 350, "sector": "Roads & Highways", "ministry": "Ministry of Road Transport & Highways"}'
```

Confirm the two `risk_score` values differ, and that the sector with the higher printed
`feature_importances_` weight and higher historical mean overrun (Water Resources, ~88% anchored mean)
returns the higher risk score — consistent with `ml/model.py`'s printed feature importances.

### Talking points

See `docs/FINDINGS.md` for the full write-up. Short version:

1. We ran the actual baseline-vs-ML comparison the problem statement asks for — and reported honestly
   that on this dataset size, a plain linear baseline currently beats the tree ensemble on raw
   regression error, while the risk-category classifier still hits 70.6% accuracy — a specific,
   defensible claim rather than an inflated one.
2. The ablation study shows CUF-only fields get ~22.8 RMSE; adding engineered signals (mainly
   `physical_progress_pct`, already collected but unused for risk scoring) cuts that to ~18.6 — an
   18.6% improvement, pointing at a concrete, low-cost recommendation for MoSPI.
3. Every prediction — including the what-if slider — is a live call to a real, trained model, not a
   lookup table, verifiable with the two curl commands above.
