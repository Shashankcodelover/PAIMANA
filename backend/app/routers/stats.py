from collections import Counter, defaultdict

from fastapi import APIRouter

from app.data.loader import load_projects

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/overview")
def overview():
    projects = load_projects()
    total_original = sum(p["original_cost_cr"] for p in projects)
    total_revised = sum(p["revised_cost_cr"] for p in projects)
    total_expenditure = sum(p["expenditure_cr"] for p in projects)
    by_risk = Counter(p["risk_category"] for p in projects)
    sectors = {p["sector"] for p in projects}

    return {
        "total_projects": len(projects),
        "total_sectors": len(sectors),
        "total_original_cost_cr": round(total_original, 2),
        "total_revised_cost_cr": round(total_revised, 2),
        "total_expenditure_cr": round(total_expenditure, 2),
        "total_at_risk_cr": round(total_revised - total_original, 2),
        "count_by_risk_category": dict(by_risk),
    }


@router.get("/by-sector")
def by_sector():
    projects = load_projects()
    grouped = defaultdict(list)
    for p in projects:
        grouped[p["sector"]].append(p)

    result = []
    for sector, items in grouped.items():
        count = len(items)
        avg_overrun = sum(p["cost_overrun_pct"] for p in items) / count if count else 0
        by_risk = Counter(p["risk_category"] for p in items)
        result.append({
            "sector": sector,
            "project_count": count,
            "avg_cost_overrun_pct": round(avg_overrun, 2),
            "count_by_risk_category": dict(by_risk),
        })

    result.sort(key=lambda r: r["avg_cost_overrun_pct"], reverse=True)
    return result
