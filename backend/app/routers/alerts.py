from fastapi import APIRouter

from app.data.loader import load_projects

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
def alerts():
    projects = load_projects()
    high_risk = [p for p in projects if p["risk_category"] in ("High", "Critical")]
    high_risk.sort(key=lambda p: p["risk_score"], reverse=True)
    return high_risk
