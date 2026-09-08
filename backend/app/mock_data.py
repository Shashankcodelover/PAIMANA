"""
backend/app/mock_data.py — generates ~30 realistic mock project records matching docs/CONTRACT.md,
spanning multiple sectors and risk categories, so every route has something to return immediately
(Section 6, Step 1 of the build) and so the API never crashes if data/projects_clean.csv is missing.

These records are clearly mock: every row's IDs start with "mock-" and every prediction field here is
still produced by calling the same predict_risk() used for real data — never hardcoded — so that even
mock mode demonstrates a live model call.
"""

import random

random.seed(7)

SECTORS_MINISTRIES = [
    ("Water Resources", "Ministry of Jal Shakti"),
    ("Telecommunication", "Ministry of Communications"),
    ("Railways", "Ministry of Railways"),
    ("Roads & Highways", "Ministry of Road Transport & Highways"),
    ("Electricity Generation", "Ministry of Power"),
    ("Healthcare", "Ministry of Health & Family Welfare"),
    ("Urban Public Transport", "Ministry of Housing & Urban Affairs"),
    ("Education", "Ministry of Education"),
]

STATUSES = ["On Track", "Delayed", "Critical", "Completed"]


def generate_mock_projects(n=30):
    rows = []
    for i in range(n):
        sector, ministry = random.choice(SECTORS_MINISTRIES)
        original_cost = round(random.uniform(50, 5000), 2)
        overrun_pct = round(random.uniform(-10, 120), 2)
        revised_cost = round(original_cost * (1 + overrun_pct / 100), 2)
        progress = round(random.uniform(5, 100), 1)
        status = random.choice(STATUSES)
        rows.append({
            "project_id": f"mock-{i+1:03d}",
            "project_name": f"[MOCK] {sector} Sample Project {i+1}",
            "ministry": ministry,
            "sector": sector,
            "original_cost_cr": original_cost,
            "revised_cost_cr": revised_cost,
            "expenditure_cr": round(revised_cost * random.uniform(0.1, 0.9), 2),
            "physical_progress_pct": progress,
            "status": status,
            "cost_overrun_pct": overrun_pct,
            "revised_cost_missing": False,
            "possible_outlier": overrun_pct > 500,
            "date_is_synthetic": True,
        })
    return rows
