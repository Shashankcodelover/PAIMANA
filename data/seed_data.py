"""
data/seed_data.py

Fallback dataset generator for PAIMANA Risk Watch.

Used when live MoSPI Flash Report PDF extraction (data/extract.py + data/clean.py) is not possible
(no internet access, PDF layout changed, rate-limited, etc). This script does NOT invent numbers out
of thin air: every sector's synthetic rows are statistically anchored to real, published MoSPI
aggregate figures (see docs/FINDINGS.md and README.md for citations of the headline numbers), and
five real, named, individually-verifiable projects are hardcoded exactly rather than sampled.

ASSUMPTION (logged here and in README.md "Assumptions Made"):
The real MoSPI PAIMANA dataset has ~1,948-1,981 ongoing projects. Generating that many rows adds no
value for a one-day hackathon MVP (slower training, slower frontend rendering, no better story) and
the brief's own project-count table would blow past its own "~200-300 rows" target if taken literally.
We therefore scale every sector's project count down by a fixed SCALE_FACTOR while preserving each
sector's real, anchored MEAN overrun % and relative share of the portfolio. This is a deliberate,
documented simplification, not a data-quality bug.

Every generated row is flagged:
  - date_is_synthetic = True for every row (no real dates exist in this fallback path)
  - cost_is_estimated = True for every SAMPLED row, False for the 5 hardcoded real projects
  - revised_cost_missing = True wherever a revised cost hasn't "been reported" yet
  - possible_outlier = True wherever cost_overrun_pct > 500%
"""

import numpy as np
import pandas as pd

RNG_SEED = 42
SCALE_FACTOR = 8  # see ASSUMPTION above
MIN_ROWS_PER_SECTOR = 3

rng = np.random.default_rng(RNG_SEED)

# ---------------------------------------------------------------------------
# Real, published MoSPI aggregate anchors (see docs/FINDINGS.md for citation context)
# sector -> (approx real ongoing-project count, approx real mean cost_overrun_pct)
# ---------------------------------------------------------------------------
SECTOR_ANCHORS = {
    "Water Resources": (41, 88.0),
    "Telecommunication": (14, 80.0),
    "Energy Storage": (17, 48.0),
    "Electricity Generation": (38, 19.0),
    "Railways": (247, 22.0),
    "Metals & Mining": (7, 24.0),
    "Healthcare": (37, 21.0),
    "Urban Public Transport": (28, 6.0),
    "Roads & Highways": (1108, 3.0),
    "Education": (30, -4.0),
}

# Remaining sectors to reach PAIMANA's real ~22-sector spread. These are real MoSPI-tracked sectors,
# but their per-sector mean overrun % is NOT individually cited anywhere we have a source for, so per
# the brief we sample a mean uniformly in [5, 35] and mark them as less precisely anchored.
OTHER_SECTORS = [
    "Civil Aviation",
    "Ports, Shipping and Waterways",
    "Petroleum & Natural Gas",
    "Coal",
    "Steel",
    "Fertilizers",
    "Rural Development",
    "Housing & Urban Affairs",
    "Atomic Energy",
    "Renewable Energy",
    "Tourism",
    "Agriculture & Farmers Welfare",
]

SECTOR_TO_MINISTRY = {
    "Water Resources": "Ministry of Jal Shakti",
    "Telecommunication": "Ministry of Communications",
    "Energy Storage": "Ministry of Power",
    "Electricity Generation": "Ministry of Power",
    "Railways": "Ministry of Railways",
    "Metals & Mining": "Ministry of Mines",
    "Healthcare": "Ministry of Health & Family Welfare",
    "Urban Public Transport": "Ministry of Housing & Urban Affairs",
    "Roads & Highways": "Ministry of Road Transport & Highways",
    "Education": "Ministry of Education",
    "Civil Aviation": "Ministry of Civil Aviation",
    "Ports, Shipping and Waterways": "Ministry of Ports, Shipping and Waterways",
    "Petroleum & Natural Gas": "Ministry of Petroleum & Natural Gas",
    "Coal": "Ministry of Coal",
    "Steel": "Ministry of Steel",
    "Fertilizers": "Ministry of Chemicals & Fertilizers",
    "Rural Development": "Ministry of Rural Development",
    "Housing & Urban Affairs": "Ministry of Housing & Urban Affairs",
    "Atomic Energy": "Department of Atomic Energy",
    "Renewable Energy": "Ministry of New and Renewable Energy",
    "Tourism": "Ministry of Tourism",
    "Agriculture & Farmers Welfare": "Ministry of Agriculture & Farmers Welfare",
}

# Rough typical single-project cost scale (in ₹ crore, lognormal median) per sector, so mega-sectors
# like Water Resources/Railways look meaningfully bigger than Education/Tourism line items.
SECTOR_COST_MEDIAN_CR = {
    "Water Resources": 900,
    "Telecommunication": 3000,
    "Energy Storage": 600,
    "Electricity Generation": 1500,
    "Railways": 1200,
    "Metals & Mining": 400,
    "Healthcare": 150,
    "Urban Public Transport": 2500,
    "Roads & Highways": 350,
    "Education": 120,
    "Civil Aviation": 800,
    "Ports, Shipping and Waterways": 700,
    "Petroleum & Natural Gas": 2000,
    "Coal": 500,
    "Steel": 1000,
    "Fertilizers": 900,
    "Rural Development": 200,
    "Housing & Urban Affairs": 600,
    "Atomic Energy": 4000,
    "Renewable Energy": 700,
    "Tourism": 100,
    "Agriculture & Farmers Welfare": 150,
}

DELAY_CAUSES = [
    "land acquisition delays",
    "forest/environment clearance delays",
    "financing tie-up delays",
    "delays finalising detailed engineering",
    "scope changes",
    "tendering/ordering delays",
    "law-and-order issues",
    "geological surprises",
    "contractual disputes",
]


def sector_status(progress_pct, overrun_pct):
    if progress_pct >= 99:
        return "Completed"
    if overrun_pct > 50 or progress_pct < 25:
        return "Critical"
    if overrun_pct > 15 or progress_pct < 55:
        return "Delayed"
    return "On Track"


def make_sector_rows(sector, count, mean_overrun, id_start):
    rows = []
    median_cost = SECTOR_COST_MEDIAN_CR.get(sector, 500)
    ministry = SECTOR_TO_MINISTRY.get(sector, "Ministry (Unmapped)")
    # lognormal so most projects cluster near the median with a long tail of mega-projects
    sigma = 0.9
    mu = np.log(median_cost)
    for i in range(count):
        pid = str(id_start + i)
        original_cost = float(np.round(rng.lognormal(mu, sigma), 2))
        original_cost = max(original_cost, 5.0)

        # variance around the sector's anchored mean overrun; wider variance for higher means
        std = max(8.0, abs(mean_overrun) * 0.55)
        overrun_pct = float(rng.normal(mean_overrun, std))
        overrun_pct = float(np.clip(overrun_pct, -60, 650))

        revised_missing = rng.random() < 0.06
        if revised_missing:
            revised_cost = original_cost
            overrun_pct = 0.0
        else:
            revised_cost = round(original_cost * (1 + overrun_pct / 100), 2)

        progress_pct = float(np.clip(rng.beta(2.2, 1.8) * 100, 0, 100))
        # projects already reported "completed" cluster near 100
        if rng.random() < 0.10:
            progress_pct = float(np.clip(rng.normal(99, 1.5), 90, 100))

        expenditure_frac = np.clip(rng.normal(progress_pct / 100, 0.08), 0.02, 1.05)
        expenditure_cr = round(revised_cost * expenditure_frac, 2)

        status = sector_status(progress_pct, overrun_pct)
        possible_outlier = overrun_pct > 500

        rows.append({
            "project_id": pid,
            "project_name": f"{sector} Project {pid}",
            "ministry": ministry,
            "sector": sector,
            "original_cost_cr": original_cost,
            "revised_cost_cr": revised_cost,
            "expenditure_cr": expenditure_cr,
            "physical_progress_pct": round(progress_pct, 1),
            "status": status,
            "cost_overrun_pct": round(overrun_pct, 2),
            "revised_cost_missing": bool(revised_missing),
            "possible_outlier": bool(possible_outlier),
            "date_is_synthetic": True,
            "cost_is_estimated": True,
            "primary_delay_cause": rng.choice(DELAY_CAUSES) if status in ("Delayed", "Critical") else "",
        })
    return rows


def hardcoded_real_projects():
    """Five real, named, individually-citable PAIMANA projects — not sampled."""
    rows = [
        dict(project_id="701415", project_name="Polavaram Irrigation Project",
             ministry=SECTOR_TO_MINISTRY["Water Resources"], sector="Water Resources",
             original_cost_cr=10151.0, revised_cost_cr=55549.0, expenditure_cr=42000.0,
             physical_progress_pct=72.0, revised_cost_missing=False,
             primary_delay_cause="scope changes"),
        dict(project_id="706775", project_name="BharatNet",
             ministry=SECTOR_TO_MINISTRY["Telecommunication"], sector="Telecommunication",
             original_cost_cr=61109.0, revised_cost_cr=188000.0, expenditure_cr=95000.0,
             physical_progress_pct=65.0, revised_cost_missing=False,
             primary_delay_cause="tendering/ordering delays"),
        dict(project_id="705237", project_name="Western Dedicated Freight Corridor",
             ministry=SECTOR_TO_MINISTRY["Railways"], sector="Railways",
             original_cost_cr=51101.0, revised_cost_cr=124005.0, expenditure_cr=118000.0,
             physical_progress_pct=96.0, revised_cost_missing=False,
             primary_delay_cause="land acquisition delays"),
        dict(project_id="705728", project_name="Mumbai-Ahmedabad High Speed Rail",
             ministry=SECTOR_TO_MINISTRY["Railways"], sector="Railways",
             original_cost_cr=108000.0, revised_cost_cr=108000.0, expenditure_cr=61000.0,
             physical_progress_pct=48.0, revised_cost_missing=False,
             primary_delay_cause="land acquisition delays"),
        dict(project_id="701530", project_name="Ken-Betwa Linking Project",
             ministry=SECTOR_TO_MINISTRY["Water Resources"], sector="Water Resources",
             original_cost_cr=44605.0, revised_cost_cr=44605.0, expenditure_cr=6000.0,
             physical_progress_pct=18.0, revised_cost_missing=True,
             primary_delay_cause="forest/environment clearance delays"),
    ]
    out = []
    for r in rows:
        overrun = round((r["revised_cost_cr"] - r["original_cost_cr"]) / r["original_cost_cr"] * 100, 2)
        status = sector_status(r["physical_progress_pct"], overrun)
        out.append({
            **r,
            "cost_overrun_pct": 0.0 if r["revised_cost_missing"] else overrun,
            "status": status,
            "possible_outlier": overrun > 500,
            "date_is_synthetic": True,  # dates themselves are still placeholders in this fallback path
            "cost_is_estimated": False,  # these five cost figures are real, cited numbers
        })
    return out


def generate(target_total=250):
    all_rows = []
    next_id = 900000

    anchored_total_real = sum(c for c, _ in SECTOR_ANCHORS.values())
    for sector, (real_count, mean_overrun) in SECTOR_ANCHORS.items():
        scaled = max(MIN_ROWS_PER_SECTOR, round(real_count / SCALE_FACTOR))
        rows = make_sector_rows(sector, scaled, mean_overrun, next_id)
        next_id += scaled + 1
        all_rows.extend(rows)

    # remaining budget split across the 12 less-precisely-anchored sectors
    remaining_budget = max(len(OTHER_SECTORS) * MIN_ROWS_PER_SECTOR, target_total - len(all_rows))
    per_other = max(MIN_ROWS_PER_SECTOR, remaining_budget // len(OTHER_SECTORS))
    for sector in OTHER_SECTORS:
        mean_overrun = float(rng.uniform(5, 35))
        rows = make_sector_rows(sector, per_other, mean_overrun, next_id)
        next_id += per_other + 1
        all_rows.extend(rows)

    all_rows.extend(hardcoded_real_projects())

    df = pd.DataFrame(all_rows)
    cols = [
        "project_id", "project_name", "ministry", "sector",
        "original_cost_cr", "revised_cost_cr", "expenditure_cr", "physical_progress_pct",
        "status", "cost_overrun_pct", "revised_cost_missing", "possible_outlier",
        "date_is_synthetic", "cost_is_estimated", "primary_delay_cause",
    ]
    df = df[cols]
    return df


if __name__ == "__main__":
    df = generate()
    out_path = "data/projects_clean.csv"
    df.to_csv(out_path, index=False)
    print(f"[seed_data] Generated {len(df)} rows across {df['sector'].nunique()} sectors "
          f"and {df['ministry'].nunique()} ministries.")
    print(f"[seed_data] % revised_cost_missing: {df['revised_cost_missing'].mean()*100:.1f}%")
    print(f"[seed_data] % date_is_synthetic: {df['date_is_synthetic'].mean()*100:.1f}% (100% expected — fallback path)")
    print(f"[seed_data] % possible_outlier: {df['possible_outlier'].mean()*100:.1f}%")
    print(f"[seed_data] Overall mean cost_overrun_pct: {df['cost_overrun_pct'].mean():.1f}%")
    print(f"[seed_data] Wrote {out_path}")
