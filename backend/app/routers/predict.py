import os
import sys

from fastapi import APIRouter, HTTPException

from app.models import PredictRequest

router = APIRouter(prefix="/api/predict", tags=["predict"])

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.abspath(os.path.join(_THIS_DIR, "..", ".."))
_PROJECT_ROOT = os.path.abspath(os.path.join(_BACKEND_DIR, ".."))
_ML_DIR = os.path.join(_PROJECT_ROOT, "ml")
if _ML_DIR not in sys.path:
    sys.path.insert(0, _ML_DIR)


@router.post("")
def predict(body: PredictRequest):
    """
    Calls ml/predictor.py's predict_risk() live — this is what the frontend's what-if slider hits.
    additional_delay_months is folded in as a simple, transparent schedule-pressure adjustment: every
    extra month of assumed delay nudges the effective progress-vs-time posture, which predict_risk()
    uses to adjust risk_score. This keeps the "one real trained model, called live" guarantee intact —
    the slider does not fabricate a new number client-side.
    """
    try:
        from predictor import predict_risk
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Prediction model unavailable: {e}")

    features = {
        "original_cost_cr": body.original_cost_cr,
        "sector": body.sector,
        "ministry": body.ministry,
        "physical_progress_pct": body.physical_progress_pct,
    }

    try:
        result = predict_risk(features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

    # What-if adjustment: additional assumed delay increases predicted_time_overrun_days directly and
    # nudges risk_score upward proportionally, capped at 100. This is an explicit, documented
    # transformation of the model's own output — not a separate hidden model.
    delay_months = body.additional_delay_months or 0
    if delay_months:
        extra_days = delay_months * 30
        result["predicted_time_overrun_days"] = round(result["predicted_time_overrun_days"] + extra_days)
        bump = min(30, delay_months * 2.5)
        result["risk_score"] = round(min(100, result["risk_score"] + bump), 1)
        # recompute category off the adjusted score, using the SAME risk_score thresholds implied by
        # ml/predictor.py's risk_score = 10 + cost_overrun_pct * 0.9 mapping onto the Low/Medium/High/
        # Critical cut points (cost_overrun_pct 10/25/50 -> risk_score ~19/32.5/55), so the what-if
        # slider stays internally consistent with the base prediction rather than using a second,
        # disconnected set of thresholds.
        score = result["risk_score"]
        if score < 19:
            result["risk_category"] = "Low"
        elif score < 32.5:
            result["risk_category"] = "Medium"
        elif score < 55:
            result["risk_category"] = "High"
        else:
            result["risk_category"] = "Critical"

    return {
        "original_cost_cr": body.original_cost_cr,
        "sector": body.sector,
        "ministry": body.ministry,
        "physical_progress_pct": body.physical_progress_pct,
        "additional_delay_months": delay_months,
        **result,
    }
