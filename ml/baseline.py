"""
ml/baseline.py — plain linear regression baseline predicting cost_overrun_pct.

This is the statistical baseline that the real model (ml/model.py) must beat and be compared
against — this comparison directly answers the problem statement's own question of whether ML
actually outperforms plain statistics.
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

DATA_PATH = "data/projects_clean.csv"


def load_features(df):
    X = df[["original_cost_cr", "sector", "ministry"]].copy()
    y = df["cost_overrun_pct"].copy()
    return X, y


def build_pipeline():
    pre = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), ["sector", "ministry"]),
        ],
        remainder="passthrough",
    )
    return Pipeline([("pre", pre), ("model", LinearRegression())])


def run():
    df = pd.read_csv(DATA_PATH)
    X, y = load_features(df)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    pipe = build_pipeline()
    pipe.fit(X_train, y_train)
    preds = pipe.predict(X_test)

    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    mae = float(mean_absolute_error(y_test, preds))

    print("=" * 60)
    print("[baseline] Linear Regression — predicting cost_overrun_pct")
    print(f"[baseline] Test RMSE: {rmse:.2f}")
    print(f"[baseline] Test MAE:  {mae:.2f}")
    print("=" * 60)
    return {"rmse": rmse, "mae": mae}


if __name__ == "__main__":
    run()
