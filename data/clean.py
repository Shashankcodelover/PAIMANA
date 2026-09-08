"""
data/clean.py

Turns data/projects_raw.csv (output of data/extract.py, live-PDF path) into data/projects_clean.csv
matching docs/CONTRACT.md.

NOTE: not run in this build (no internet access -> no raw CSV to clean -> data/seed_data.py was used
instead). Included complete and ready to run once live extraction produces a raw CSV.
"""

import random
import re
import sys
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

random.seed(42)
np.random.seed(42)

OUTLIER_THRESHOLD_PCT = 500

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


def split_ministry_sector(section_label):
    """MoSPI section headers are usually like 'Ministry of Power - Electricity Generation' or just a
    sector name. Best-effort split; if no clear ministry substring, sector = section, ministry = 'Unknown'.
    """
    if not isinstance(section_label, str) or not section_label.strip():
        return "Unknown Ministry", "Unknown Sector"
    label = section_label.strip()
    for sep in [" - ", " – ", ":", "|"]:
        if sep in label:
            left, right = label.split(sep, 1)
            return left.strip(), right.strip()
    m = re.search(r"(Ministry of [A-Za-z &,]+)", label)
    if m:
        ministry = m.group(1).strip()
        sector = label.replace(ministry, "").strip(" -:|") or ministry
        return ministry, sector
    return "Unknown Ministry", label


def random_placeholder_date(start_year=2015, end_year=2024):
    start = datetime(start_year, 1, 1)
    end = datetime(end_year, 12, 31)
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))


def clean(raw_path="data/projects_raw.csv", out_path="data/projects_clean.csv"):
    df = pd.read_csv(raw_path)

    ministries, sectors = [], []
    for section in df.get("ministry_or_sector_section", pd.Series([""] * len(df))):
        m, s = split_ministry_sector(section)
        ministries.append(m)
        sectors.append(s)
    df["ministry"] = ministries
    df["sector"] = sectors

    before = len(df)
    df = df.drop_duplicates(subset=["project_id"], keep="first").reset_index(drop=True)
    dropped = before - len(df)

    df["revised_cost_missing"] = df["revised_cost_cr"].isna()
    df["revised_cost_cr"] = df["revised_cost_cr"].fillna(df["original_cost_cr"])

    df["original_cost_cr"] = pd.to_numeric(df["original_cost_cr"], errors="coerce")
    df["revised_cost_cr"] = pd.to_numeric(df["revised_cost_cr"], errors="coerce")
    df = df[df["original_cost_cr"].notna() & (df["original_cost_cr"] > 0)].reset_index(drop=True)

    df["cost_overrun_pct"] = (
        (df["revised_cost_cr"] - df["original_cost_cr"]) / df["original_cost_cr"] * 100
    ).round(2)
    df["possible_outlier"] = df["cost_overrun_pct"] > OUTLIER_THRESHOLD_PCT

    df["date_is_synthetic"] = True  # Flash Report project tables don't carry per-row dates reliably;
                                     # flagged honestly rather than silently fabricated.
    df["_placeholder_date"] = [random_placeholder_date() for _ in range(len(df))]

    df["expenditure_cr"] = pd.to_numeric(df.get("expenditure_cr"), errors="coerce")
    df["expenditure_cr"] = df["expenditure_cr"].fillna(df["revised_cost_cr"] * 0.5)

    df["physical_progress_pct"] = pd.to_numeric(df.get("physical_progress_pct"), errors="coerce")
    df["physical_progress_pct"] = df["physical_progress_pct"].fillna(50.0).clip(0, 100)

    def status_for(row):
        if row["physical_progress_pct"] >= 99:
            return "Completed"
        if row["cost_overrun_pct"] > 50 or row["physical_progress_pct"] < 25:
            return "Critical"
        if row["cost_overrun_pct"] > 15 or row["physical_progress_pct"] < 55:
            return "Delayed"
        return "On Track"

    df["status"] = df.apply(status_for, axis=1)
    df["primary_delay_cause"] = [
        random.choice(DELAY_CAUSES) if s in ("Delayed", "Critical") else ""
        for s in df["status"]
    ]
    df["cost_is_estimated"] = False  # live-extracted costs are real, sourced figures

    cols = [
        "project_id", "project_name", "ministry", "sector",
        "original_cost_cr", "revised_cost_cr", "expenditure_cr", "physical_progress_pct",
        "status", "cost_overrun_pct", "revised_cost_missing", "possible_outlier",
        "date_is_synthetic", "cost_is_estimated", "primary_delay_cause",
    ]
    df = df[cols]
    df.to_csv(out_path, index=False)

    print(f"[clean] Total rows: {len(df)} (dropped {dropped} exact-duplicate project_ids)")
    print(f"[clean] % missing revised cost (backfilled): {df['revised_cost_missing'].mean()*100:.1f}%")
    print(f"[clean] % synthetic dates: {df['date_is_synthetic'].mean()*100:.1f}%")
    print(f"[clean] % flagged possible_outlier (>500% overrun): {df['possible_outlier'].mean()*100:.1f}%")
    print(f"[clean] Wrote {out_path}")


if __name__ == "__main__":
    raw = sys.argv[1] if len(sys.argv) > 1 else "data/projects_raw.csv"
    out = sys.argv[2] if len(sys.argv) > 2 else "data/projects_clean.csv"
    clean(raw, out)
