# PAIMANA Deployment Guide & Agent Instructions

This document provides clear, conflict-free instructions for any developer or autonomous AI agent building, updating, and deploying the **PAIMANA Risk Watch** project.

---

## 1. Project Architecture & Differentiation

This repository is organized into distinct frontend and backend layers:

| Layer | Technology | Primary Role | Recommended Deployment |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 18, Vite 5 | Interactive dashboard, sector charts, risk tables, and what-if simulation sliders | **Vercel** (Global Edge CDN) |
| **Backend** | Python 3.11, FastAPI, Scikit-learn, XGBoost / RandomForest, Pandas | Statistical data loading, ML overrun inference, `/api/*` endpoints | **Render / Railway / Docker** |

> [!NOTE]
> **Why separate them?**
> The backend relies on heavy scientific computing libraries (`scikit-learn`, `xgboost`, `pandas`, `joblib`), which require a persistent container or Docker environment (Render/Railway). The frontend is a static React Single Page Application (SPA), which deploys best on **Vercel**.

---

## 2. Deploying the Frontend to Vercel

Vercel now works out-of-the-box whether you deploy from the **root directory** or the **`frontend/` subfolder**.

### Option A: Deploying from Repository Root (Easiest)
1. In Vercel Dashboard, click **Add New** → **Project** and import `PAIMANA`.
2. Leave **Root Directory** as `.` (root).
3. Vercel automatically detects `vercel.json` and `package.json` at the root:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` (runs `cd frontend && npm install && npm run build`)
   - **Output Directory**: `frontend/dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: URL of your deployed backend (e.g., `https://paimana-risk-watch.onrender.com`).
   *(If not set during preview, the UI will safely notify you rather than crashing).*
5. Click **Deploy**.

### Option B: Deploying with Root Directory set to `frontend`
1. In Vercel Dashboard, import `PAIMANA`.
2. In Project Settings, set **Root Directory** to `frontend`.
3. Vercel uses `frontend/vercel.json`:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://your-backend-api-url.com`
5. Click **Deploy**.

---

## 3. Deploying the Backend (Render / Railway / Docker)

### Deploying to Render (Recommended)
1. Log in to [render.com](https://render.com) and click **New +** → **Blueprint**.
2. Connect this repository. Render automatically reads `backend/render.yaml`.
3. Render builds the Docker container (`backend/Dockerfile`), starts the FastAPI service on port 8000, and monitors health at `/api/health`.
4. Copy your service URL (e.g., `https://paimana-backend.onrender.com`) and paste it as `VITE_API_URL` in Vercel.

### Deploying with Docker (Any Cloud / VPS)
```bash
# Build the container from repo root
docker build -t paimana-risk-watch -f backend/Dockerfile .

# Run container on port 8000
docker run -d -p 8000:8000 --name paimana paimana-risk-watch
```

---

## 4. Local Development & Verification

### Running the Backend
```bash
# 1. Install dependencies
pip install -r backend/requirements.txt

# 2. Ensure seed data and trained models exist
python data/seed_data.py
cd ml && python model.py && cd ..

# 3. Start FastAPI server
uvicorn app.main:app --reload --port 8000 --app-dir backend
```

### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. The frontend automatically proxies `/api` calls to `http://localhost:8000`.

---

## 5. Agent Instructions: Updating & Verifying Without Conflicts

When an automated agent modifies this repository, it should follow this 4-step checklist:

1. **Frontend Code Changes**:
   - Always run `npm run build` from either the root or `frontend/` directory to verify there are no JSX or bundler errors.
   - Never hardcode absolute `http://localhost:8000` URLs in client components; always use `BASE_URL` from `frontend/src/api.js`.

2. **Backend / ML Code Changes**:
   - If modifying features or data columns, ensure `ml/predictor.py` and `backend/app/models.py` stay synchronized.
   - Run `python ml/predictor.py` to verify predictions and prevent string/encoding errors.

3. **Environment Compatibility**:
   - Avoid non-ASCII characters (like unescaped currency symbols) in Python stdout logging to maintain compatibility across Windows and Linux environments.
   - Always preserve batch prediction caching in `backend/app/data/loader.py` to keep startup times under 3 seconds.

4. **Deployment Verification**:
   - Test that `/api/health` returns `{"status":"ok"}`.
   - Ensure `vercel.json` (both in root and `frontend/`) maintains SPA rewrites (`{"source": "/(.*)", "destination": "/index.html"}`) so deep links never return 404.