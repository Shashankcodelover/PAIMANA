"""
ml/predictor.py

Exactly one public function: predict_risk(features: dict) -> dict.

Loads the trained regressor/classifier/preprocessor saved by ml/model.py and produces a real
prediction — never a hardcoded or random number. This is the ONLY bridge between the ML layer and the
backend; the backend imports this module and calls predict_risk(), nothing else.
"""

import json
import os

import joblib
import numpy as np

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(_THIS_DIR, "models")

_preprocessor = None
_regressor = None
_classifier = None
_label_encoder = None
_metadata = None


def _lazy_load():
    global _preprocessor, _regressor, _classifier, _label_encoder, _metadata
    if _preprocessor is not None:
        return
    _preprocessor = joblib.load(os.path.join(MODELS_DIR, "preprocessor.joblib"))
    _regressor = joblib.load(os.path.join(MODELS_DIR, "regressor.joblib"))
    _classifier = joblib.load(os.path.join(MODELS_DIR, "classifier.joblib"))
    le_path = os.path.join(MODELS_DIR, "label_encoder.joblib")
    _label_encoder = joblib.load(le_path) if os.path.exists(le_path) else None
    with open(os.path.join(MODELS_DIR, "metadata.json")) as f:
        _metadata = json.load(f)


def _categorize(overrun_pct):
    if overrun_pct < 10:
        return "Low"
    elif overrun_pct < 25:
        return "Medium"
    elif overrun_pct < 50:
        return "High"
    else:
        return "Critical"


def _plain_english_feature_name(raw_name):
    name = raw_name
    for prefix in ["cat__", "remainder__"]:
        name = name.replace(prefix, "")
    if name.startswith("sector_"):
        return f"{name[len('sector_'):]} sector has historically high overruns"
    if name.startswith("ministry_"):
        return f"{name[len('ministry_'):]} has a track record worth watching"
    if name == "original_cost_cr":
        return None  # handled specially with the actual value below
    return name.replace("_", " ")


def _top_risk_factors(features, feature_names, shap_like_scores, original_cost_cr):
    """Rank this specific row's contributing features and render them as plain-English strings.
    Uses the model's global feature_importances_ weighted by whether this row activates that
    one-hot feature, which is a reasonable, dependency-free stand-in for a full SHAP explainer at
    hackathon scope — documented as such rather than oversold as true SHAP.
    """
    order = np.argsort(shap_like_scores)[::-1]
    factors = []
    for idx in order:
        if len(factors) >= 3:
            break
        raw_name = feature_names[idx]
        clean_name = raw_name.replace("cat__", "").replace("remainder__", "")
        if clean_name == "original_cost_cr":
            factors.append(f"Large original budget (₹{original_cost_cr:,.0f} cr) raises exposure")
            continue
        # one-hot columns are named like 'sector_Water Resources' — only relevant if this row IS that value
        if clean_name.startswith("sector_"):
            sector_val = clean_name[len("sector_"):]
            if features.get("sector") == sector_val:
                factors.append(f"{sector_val} sector has historically high overruns")
            continue
        if clean_name.startswith("ministry_"):
            ministry_val = clean_name[len("ministry_"):]
            if features.get("ministry") == ministry_val:
                factors.append(f"{ministry_val} projects have a mixed delivery track record")
            continue
    if not factors:
        factors = ["Insufficient distinguishing signal — treated as an average-risk project"]
    while len(factors) < 3:
        factors.append("No further distinguishing factor identified for this project")
    return factors[:3]


def predict_risk(features: dict) -> dict:
    """
    features: dict with at least {original_cost_cr, sector, ministry}. Optionally
              {physical_progress_pct} for a sharper time-overrun estimate.

    Returns: {
        cost_overrun_pct, predicted_time_overrun_days, risk_score (0-100),
        risk_category, top_risk_factors (list[str], len 3)
    }
    """
    _lazy_load()

    import pandas as pd
    row = pd.DataFrame([{
        "original_cost_cr": float(features.get("original_cost_cr", 0) or 0),
        "sector": features.get("sector", "Unknown"),
        "ministry": features.get("ministry", "Unknown"),
    }])

    X = _preprocessor.transform(row)
    cost_overrun_pct = float(_regressor.predict(X)[0])
    cost_overrun_pct = max(cost_overrun_pct, -80.0)  # sanity clip; a project can't "un-cost" more than this

    if _label_encoder is not None:
        clf_pred_enc = _classifier.predict(X)[0]
        risk_category = _label_encoder.inverse_transform([clf_pred_enc])[0]
    else:
        risk_category = _classifier.predict(X)[0]

    # risk_score scaled 0-100 from cost_overrun_pct (0% -> ~10, 100%+ -> 100), monotonic and bounded
    risk_score = float(np.clip(10 + cost_overrun_pct * 0.9, 0, 100))

    # a simple, transparent delay-days estimate derived from overrun % (documented assumption: ~6
    # days of schedule slip per 1% of cost overrun, floored at 0) — not a separately trained model,
    # since the seed dataset carries no ground-truth schedule-slip-in-days column to train one on.
    predicted_time_overrun_days = max(0, round(cost_overrun_pct * 6))

    # optional: nudge risk if the project reports itself as barely progressed with heavy overrun exposure
    progress = features.get("physical_progress_pct")
    if progress is not None:
        try:
            progress = float(progress)
            if progress < 30 and cost_overrun_pct > 15:
                risk_score = float(np.clip(risk_score + 5, 0, 100))
        except (TypeError, ValueError):
            pass

    feature_names = _preprocessor.get_feature_names_out()
    top_factors = _top_risk_factors(
        {"sector": row["sector"].iloc[0], "ministry": row["ministry"].iloc[0]},
        feature_names,
        _regressor.feature_importances_,
        row["original_cost_cr"].iloc[0],
    )

    return {
        "cost_overrun_pct": round(cost_overrun_pct, 2),
        "predicted_cost_overrun_pct": round(cost_overrun_pct, 2),
        "predicted_time_overrun_days": predicted_time_overrun_days,
        "risk_score": round(risk_score, 1),
        "risk_category": risk_category,
        "top_risk_factors": top_factors,
    }


if __name__ == "__main__":
    # quick manual sanity check
    examples = [
        {"original_cost_cr": 10151, "sector": "Water Resources", "ministry": "Ministry of Jal Shakti"},
        {"original_cost_cr": 350, "sector": "Roads & Highways", "ministry": "Ministry of Road Transport & Highways"},
    ]
    for ex in examples:
        print(ex, "->", predict_risk(ex))
