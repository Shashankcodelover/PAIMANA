"""
ml/ablation.py — answers the problem statement's third sub-question directly: does prediction
quality depend on the fields the government currently collects, or on additional signals not
presently captured?

Model A (CUF-only): original_cost_cr, sector, ministry — fields the government already collects.
Model B (CUF + engineered): the same fields, plus sector-average historical overrun %, ministry-average
historical overrun % (both computed only from the training split, no leakage), a project-size bucket
(small/medium/mega by original_cost_cr terciles), and physical_progress_pct.

Writes the comparison + a plain-English summary into docs/FINDINGS.md (appended after model.py's
section, see ml/model.py + this script are both consumed by scripts/build_findings.py — but to keep
things simple and dependency-free, this script directly prints numbers that get pasted into
FINDINGS.md by hand during the build; see docs/FINDINGS.md for the final numbers actually used).
"""

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

try:
    from xgboost import XGBRegressor
    XGB_AVAILABLE = True
except ImportError:
    from sklearn.ensemble import RandomForestRegressor as XGBRegressor
    XGB_AVAILABLE = False

DATA_PATH = "data/projects_clean.csv"


def size_bucket(series):
    q1, q2 = series.quantile([1 / 3, 2 / 3])
    return series.apply(lambda x: "small" if x <= q1 else ("medium" if x <= q2 else "mega"))


def evaluate(X_train, X_test, y_train, y_test, categorical_cols):
    pre = ColumnTransformer(
        transformers=[("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols)],
        remainder="passthrough",
    )
    model = XGBRegressor(n_estimators=200, max_depth=5, random_state=42) if XGB_AVAILABLE else \
        XGBRegressor(n_estimators=300, max_depth=6, random_state=42)
    pipe = Pipeline([("pre", pre), ("model", model)])
    pipe.fit(X_train, y_train)
    preds = pipe.predict(X_test)
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    mae = float(mean_absolute_error(y_test, preds))
    return rmse, mae


def run():
    df = pd.read_csv(DATA_PATH)
    y = df["cost_overrun_pct"].copy()

    train_idx, test_idx = train_test_split(df.index, test_size=0.2, random_state=42)
    train_df, test_df = df.loc[train_idx].copy(), df.loc[test_idx].copy()

    # --- Model A: CUF-only (currently collected fields) ---
    X_train_a = train_df[["original_cost_cr", "sector", "ministry"]]
    X_test_a = test_df[["original_cost_cr", "sector", "ministry"]]
    rmse_a, mae_a = evaluate(X_train_a, X_test_a, y.loc[train_idx], y.loc[test_idx],
                              categorical_cols=["sector", "ministry"])

    # --- Model B: CUF + engineered (no leakage — stats computed on train split only) ---
    sector_avg = train_df.groupby("sector")["cost_overrun_pct"].mean()
    ministry_avg = train_df.groupby("ministry")["cost_overrun_pct"].mean()
    global_avg = train_df["cost_overrun_pct"].mean()

    def enrich(sub_df):
        sub_df = sub_df.copy()
        sub_df["sector_avg_overrun"] = sub_df["sector"].map(sector_avg).fillna(global_avg)
        sub_df["ministry_avg_overrun"] = sub_df["ministry"].map(ministry_avg).fillna(global_avg)
        return sub_df

    train_df_b = enrich(train_df)
    test_df_b = enrich(test_df)
    train_df_b["size_bucket"] = size_bucket(train_df["original_cost_cr"])
    # apply the SAME train-derived cut points to test to avoid leakage
    q1, q2 = train_df["original_cost_cr"].quantile([1 / 3, 2 / 3])
    test_df_b["size_bucket"] = test_df["original_cost_cr"].apply(
        lambda x: "small" if x <= q1 else ("medium" if x <= q2 else "mega")
    )

    feature_cols_b = [
        "original_cost_cr", "sector", "ministry",
        "sector_avg_overrun", "ministry_avg_overrun", "size_bucket", "physical_progress_pct",
    ]
    X_train_b = train_df_b[feature_cols_b]
    X_test_b = test_df_b[feature_cols_b]
    rmse_b, mae_b = evaluate(X_train_b, X_test_b, y.loc[train_idx], y.loc[test_idx],
                              categorical_cols=["sector", "ministry", "size_bucket"])

    print("=" * 60)
    print("[ablation] Model A (CUF-only — original_cost_cr, sector, ministry)")
    print(f"[ablation]   RMSE={rmse_a:.2f}  MAE={mae_a:.2f}")
    print("[ablation] Model B (CUF + engineered — + sector/ministry avg overrun, size bucket, progress %)")
    print(f"[ablation]   RMSE={rmse_b:.2f}  MAE={mae_b:.2f}")
    improvement = (rmse_a - rmse_b) / rmse_a * 100 if rmse_a else 0
    print(f"[ablation] RMSE improvement from engineered features: {improvement:.1f}%")
    print("=" * 60)

    return {
        "model_a_rmse": rmse_a, "model_a_mae": mae_a,
        "model_b_rmse": rmse_b, "model_b_mae": mae_b,
        "rmse_improvement_pct": improvement,
    }


if __name__ == "__main__":
    run()
