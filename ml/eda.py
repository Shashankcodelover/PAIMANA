"""
ml/eda.py — quick exploratory data analysis on data/projects_clean.csv.
Produces three plots in ml/plots/ and prints summary stats worth screenshotting for a slide.
"""

import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

DATA_PATH = "data/projects_clean.csv"
PLOTS_DIR = "ml/plots"


def main():
    os.makedirs(PLOTS_DIR, exist_ok=True)
    df = pd.read_csv(DATA_PATH)

    print("=" * 60)
    print("[eda] Shape:", df.shape)
    print("[eda] Dtypes:\n", df.dtypes)
    print("[eda] Missing values per column:\n", df.isna().sum())
    print("=" * 60)

    if "cost_overrun_pct" not in df.columns:
        df["cost_overrun_pct"] = (
            (df["revised_cost_cr"] - df["original_cost_cr"]) / df["original_cost_cr"] * 100
        )

    print("[eda] cost_overrun_pct summary:\n", df["cost_overrun_pct"].describe())
    print("[eda] Projects by sector:\n", df["sector"].value_counts())
    print("[eda] Projects by status:\n", df["status"].value_counts())

    # 1. Distribution of overrun %
    plt.figure(figsize=(8, 5))
    df["cost_overrun_pct"].clip(-100, 300).hist(bins=40, color="#3FA796")
    plt.title("Distribution of Cost Overrun % (clipped to [-100, 300] for readability)")
    plt.xlabel("Cost overrun %")
    plt.ylabel("Number of projects")
    plt.tight_layout()
    plt.savefig(f"{PLOTS_DIR}/overrun_distribution.png", dpi=120)
    plt.close()

    # 2. Boxplot by sector (top 10 by project count, else too cluttered)
    top_sectors = df["sector"].value_counts().head(10).index
    plt.figure(figsize=(10, 6))
    data_by_sector = [
        df.loc[df["sector"] == s, "cost_overrun_pct"].clip(-100, 300) for s in top_sectors
    ]
    plt.boxplot(data_by_sector, labels=top_sectors, vert=False)
    plt.title("Cost Overrun % by Sector (top 10 sectors by project count)")
    plt.xlabel("Cost overrun %")
    plt.tight_layout()
    plt.savefig(f"{PLOTS_DIR}/overrun_by_sector_boxplot.png", dpi=120)
    plt.close()

    # 3. Correlation heatmap of numeric columns
    numeric_cols = df.select_dtypes(include="number").columns
    corr = df[numeric_cols].corr()
    plt.figure(figsize=(7, 6))
    im = plt.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
    plt.colorbar(im)
    plt.xticks(range(len(numeric_cols)), numeric_cols, rotation=90)
    plt.yticks(range(len(numeric_cols)), numeric_cols)
    plt.title("Correlation Heatmap (numeric columns)")
    plt.tight_layout()
    plt.savefig(f"{PLOTS_DIR}/correlation_heatmap.png", dpi=120)
    plt.close()

    print(f"[eda] Saved 3 plots to {PLOTS_DIR}/")


if __name__ == "__main__":
    main()
