"""
backend/app/main.py — FastAPI entrypoint.

Local dev:   uvicorn app.main:app --reload --port 8000   (run from inside backend/)
Production:  uvicorn app.main:app --host 0.0.0.0 --port $PORT
             (serves frontend/dist as static files at "/", all /api/* routes stay JSON)
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routers import projects, stats, predict, alerts
from app.data.loader import load_projects

app = FastAPI(
    title="PAIMANA Risk Watch API",
    description="AI-powered early-warning system for Indian central-government infrastructure "
                "project cost/time overrun risk, built on MoSPI PAIMANA project-monitoring data.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # local dev / hackathon scope — tighten before any real production use
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(stats.router)
app.include_router(predict.router)
app.include_router(alerts.router)


@app.on_event("startup")
def on_startup():
    # Loads the CSV (or mock fallback) and runs every row through predict_risk() ONCE, caching the
    # result — Section 6, Step 2. Nothing per-request recomputes this.
    projects_loaded = load_projects()
    print(f"[main] Startup complete. {len(projects_loaded)} projects cached and ready to serve.")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Single-service deployment: serve the built React frontend from the same origin ---
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.abspath(os.path.join(_THIS_DIR, ".."))
_PROJECT_ROOT = os.path.abspath(os.path.join(_BACKEND_DIR, ".."))
_FRONTEND_DIST = os.path.join(_PROJECT_ROOT, "frontend", "dist")

if os.path.isdir(_FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(_FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # any path that isn't an /api/* route falls through to index.html so React Router-style
        # client-side navigation (if ever added) doesn't 404 on refresh
        requested = os.path.join(_FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(requested):
            return FileResponse(requested)
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def frontend_not_built():
        return {
            "message": "Frontend not built yet. Run `npm install && npm run build` inside frontend/, "
                       "or run the frontend dev server separately with `npm run dev` and point it at "
                       "this API via VITE_API_URL.",
            "api_docs": "/docs",
        }
