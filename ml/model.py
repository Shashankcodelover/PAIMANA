"""
ml/model.py — trains the real predictive models used by the API:
  1. A regressor for cost_overrun_pct (XGBoost, falls back to RandomForestRegressor).
  2. A classifier for risk_category, derived from cost_overrun_pct thresholds.

Prints a comparison against ml/baseline.py, prints feature importances in plain English, and saves
both trained models (plus the fitted preprocessing pipeline) to ml/models/ with joblib.
"""

import json

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
import joblib

try:
    from xgboost import XGBRegressor, XGBClassifier
    XGB_AVAILABLE = True
except ImportError:
    from sklearn.ensemble import RandomForestRegressor as XGBRegressor
    from sklearn.ensemble import RandomForestClassifier as XGBClassifier
    XGB_AVAILABLE = False

from baseline import run as run_baseline, load_features as load_baseline_features

DATA_PATH = "data/projects_clean.csv"
MODELS_DIR = "ml/models"

# Risk category thresholds on cost_overrun_pct — Low <10, Medium 10-25, High 25-50, Critical >50.
# The brief allows adjusting these if the real data distribution makes them silly; our seed-anchored
# distribution (median ~7%, most projects under 20%, a long tail up to 447%) makes these thresholds
# reasonable as-is, so we keep them unchanged.
def categorize(overrun_pct):
    if overrun_pct < 10:
        return "Low"
    elif overrun_pct < 25:
        return "Medium"
    elif overrun_pct < 50:
        return "High"
    else:
        return "Critical"


FEATURE_COLS = ["original_cost_cr", "sector", "ministry"]
CATEGORICAL_COLS = ["sector", "ministry"]


def build_preprocessor():
    return ColumnTransformer(
        transformers=[("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_COLS)],
        remainder="passthrough",
    )


def plain_english_feature_name(raw_name):
    """Turns 'cat__sector_Water Resources' or 'remainder__original_cost_cr' into a slide-ready label."""
    name = raw_name
    for prefix in ["cat__", "remainder__"]:
        name = name.replace(prefix, "")
    if name.startswith("sector_"):
        return f"{name[len('sector_'):]} sector"
    if name.startswith("ministry_"):
        return f"{name[len('ministry_'):]}"
    if name == "original_cost_cr":
        return "Original budget size"
    return name.replace("_", " ")


def run():
    df = pd.read_csv(DATA_PATH)
    X = df[FEATURE_COLS].copy()
    y_reg = df["cost_overrun_pct"].copy()
    y_clf = y_reg.apply(categorize)

    X_train, X_test, y_reg_train, y_reg_test, y_clf_train, y_clf_test = train_test_split(
        X, y_reg, y_clf, test_size=0.2, random_state=42, stratify=y_clf
    )

    pre = build_preprocessor()
    X_train_t = pre.fit_transform(X_train)
    X_test_t = pre.transform(X_test)

    # --- Regressor ---
    if XGB_AVAILABLE:
        reg = XGBRegressor(n_estimators=200, max_depth=4, learning_rate=0.08, random_state=42)
    else:
        reg = XGBRegressor(n_estimators=300, max_depth=6, random_state=42)
    reg.fit(X_train_t, y_reg_train)
    reg_preds = reg.predict(X_test_t)
    rmse = float(np.sqrt(mean_squared_error(y_reg_test, reg_preds)))
    mae = float(mean_absolute_error(y_reg_test, reg_preds))

    # --- Classifier ---
    if XGB_AVAILABLE:
        from sklearn.preprocessing import LabelEncoder
        le = LabelEncoder()
        y_clf_train_enc = le.fit_transform(y_clf_train)
        y_clf_test_enc = le.transform(y_clf_test)
        clf = XGBClassifier(n_estimators=200, max_depth=4, learning_rate=0.08, random_state=42,
                             eval_metric="mlogloss")
        clf.fit(X_train_t, y_clf_train_enc)
        clf_preds_enc = clf.predict(X_test_t)
        clf_preds = le.inverse_transform(clf_preds_enc)
    else:
        le = None
        clf = XGBClassifier(n_estimators=300, max_depth=6, random_state=42)
        clf.fit(X_train_t, y_clf_train)
        clf_preds = clf.predict(X_test_t)

    acc = float(accuracy_score(y_clf_test, clf_preds))
    f1 = float(f1_score(y_clf_test, clf_preds, average="weighted"))
    labels_order = ["Low", "Medium", "High", "Critical"]
    cm = confusion_matrix(y_clf_test, clf_preds, labels=labels_order)

    baseline_metrics = run_baseline()

    print("=" * 60)
    model_name = "XGBoost" if XGB_AVAILABLE else "RandomForest (xgboost unavailable, used fallback)"
    print(f"[model] Regressor comparison — predicting cost_overrun_pct")
    print(f"[model] Baseline (Linear Regression): RMSE={baseline_metrics['rmse']:.2f}  MAE={baseline_metrics['mae']:.2f}")
    print(f"[model] {model_name}:                RMSE={rmse:.2f}  MAE={mae:.2f}")
    print("-" * 60)
    print(f"[model] Classifier ({model_name}) — predicting risk_category")
    print(f"[model] Accuracy: {acc:.3f}   Weighted F1: {f1:.3f}")
    print(f"[model] Confusion matrix (rows=actual, cols=predicted), order {labels_order}:")
    print(cm)
    print("=" * 60)

    # --- Feature importances (regressor) ---
    feature_names = pre.get_feature_names_out()
    importances = reg.feature_importances_
    order = np.argsort(importances)[::-1]
    print("[model] Feature importances (regressor), plain English:")
    plain_importances = []
    for idx in order:
        label = plain_english_feature_name(feature_names[idx])
        plain_importances.append((label, float(importances[idx])))
    for label, score in plain_importances[:15]:
        print(f"    {label:45s} {score:.4f}")

    # --- Save everything the API/predictor needs ---
    import os
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(pre, f"{MODELS_DIR}/preprocessor.joblib")
    joblib.dump(reg, f"{MODELS_DIR}/regressor.joblib")
    joblib.dump(clf, f"{MODELS_DIR}/classifier.joblib")
    if le is not None:
        joblib.dump(le, f"{MODELS_DIR}/label_encoder.joblib")

    meta = {
        "xgb_available": XGB_AVAILABLE,
        "model_type": model_name,
        "feature_cols": FEATURE_COLS,
        "categorical_cols": CATEGORICAL_COLS,
        "risk_thresholds": {"Low": "<10%", "Medium": "10-25%", "High": "25-50%", "Critical": ">50%"},
        "regressor_rmse": rmse,
        "regressor_mae": mae,
        "baseline_rmse": baseline_metrics["rmse"],
        "baseline_mae": baseline_metrics["mae"],
        "classifier_accuracy": acc,
        "classifier_f1": f1,
        "feature_importances": plain_importances,
    }
    with open(f"{MODELS_DIR}/metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    print(f"[model] Saved models + metadata to {MODELS_DIR}/")
    return meta


if __name__ == "__main__":
    run()
