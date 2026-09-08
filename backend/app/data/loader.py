"""
backend/app/data/loader.py

Loads data/projects_clean.csv into a cached in-memory pandas DataFrame at startup. If the file is
missing, falls back to mock_data.py and prints a clear warning instead of crashing.

Also runs every row through ml/predictor.py's predict_risk() exactly once at startup and caches the
result on each project record (Section 6, Step 2) — the frontend never triggers a fresh prediction
for a listed project; it only does that for the live what-if slider via POST /api/predict.
"""

import os
import sys

import pandas as pd

from app.mock_data import generate_mock_projects

# Make ml/ importable regardless of where uvicorn is launched from.
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.abspath(os.path.join(_THIS_DIR, "..", ".."))
_PROJECT_ROOT = os.path.abspath(os.path.join(_BACKEND_DIR, ".."))
_ML_DIR = os.path.join(_PROJECT_ROOT, "ml")
if _ML_DIR not in sys.path:
    sys.path.insert(0, _ML_DIR)

CSV_PATH = os.path.join(_PROJECT_ROOT, "data", "projects_clean.csv")

_cache = {"projects": None}


def _rule_based_fallback(row):
    """Used only if predict_risk() throws for a specific row — never crashes the whole endpoint."""
    overrun = float(row.get("cost_overrun_pct", 0) or 0)
    risk_score = max(0, min(100, 10 + overrun * 0.9))
    if overrun < 10:
        category = "Low"
    elif overrun < 25:
        category = "Medium"
    elif overrun < 50:
        category = "High"
    else:
        category = "Critical"
    return {
        "cost_overrun_pct": round(overrun, 2),
        "predicted_cost_overrun_pct": round(overrun, 2),
        "predicted_time_overrun_days": max(0, round(overrun * 6)),
        "risk_score": round(risk_score, 1),
        "risk_category": category,
        "top_risk_factors": ["Rule-based fallback estimate (model unavailable for this row)"] * 1
                            + ["No further distinguishing factor identified for this project"] * 2,
    }


def _row_to_project_dict(row, predict_risk_fn):
    base = {
        "project_id": str(row["project_id"]),
        "project_name": row["project_name"],
        "ministry": row["ministry"],
        "sector": row["sector"],
        "original_cost_cr": float(row["original_cost_cr"]),
        "revised_cost_cr": float(row["revised_cost_cr"]),
        "expenditure_cr": float(row["expenditure_cr"]),
        "physical_progress_pct": float(row["physical_progress_pct"]),
        "status": row["status"],
        "cost_overrun_pct": float(row["cost_overrun_pct"]),
        "revised_cost_missing": bool(row.get("revised_cost_missing", False)),
        "possible_outlier": bool(row.get("possible_outlier", False)),
        "date_is_synthetic": bool(row.get("date_is_synthetic", False)),
    }
    try:
        pred = predict_risk_fn({
            "original_cost_cr": base["original_cost_cr"],
            "sector": base["sector"],
            "ministry": base["ministry"],
            "physical_progress_pct": base["physical_progress_pct"],
        })
    except Exception as e:
        print(f"[loader] WARNING: predict_risk() failed for project {base['project_id']}: {e}. "
              f"Falling back to rule-based estimate for this row only.")
        pred = _rule_based_fallback(base)

    base.update({
        "predicted_cost_overrun_pct": pred["predicted_cost_overrun_pct"],
        "predicted_time_overrun_days": pred["predicted_time_overrun_days"],
        "risk_score": pred["risk_score"],
        "risk_category": pred["risk_category"],
        "top_risk_factors": pred["top_risk_factors"],
    })
    return base


def load_projects(force_reload=False):
    if _cache["projects"] is not None and not force_reload:
        return _cache["projects"]

    try:
        from predictor import predict_risk
    except Exception as e:
        print(f"[loader] WARNING: could not import ml/predictor.py ({e}). "
              f"All rows will use the rule-based fallback.")
        predict_risk = None

    def predict_fn(features):
        if predict_risk is None:
            raise RuntimeError("predictor unavailable")
        return predict_risk(features)

    if os.path.exists(CSV_PATH):
        df = pd.read_csv(CSV_PATH)
        records = df.to_dict(orient="records")
        source = "real/seed CSV"
    else:
        print(f"[loader] WARNING: {CSV_PATH} not found. Falling back to mock_data.py.")
        records = generate_mock_projects()
        source = "mock_data.py"

    projects = [_row_to_project_dict(r, predict_fn) for r in records]
    print(f"[loader] Loaded {len(projects)} projects from {source}. Predictions cached at startup.")
    _cache["projects"] = projects
    return projects


def get_project_by_id(project_id):
    for p in load_projects():
        if p["project_id"] == str(project_id):
            return p
    return None
