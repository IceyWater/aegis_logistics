#!/usr/bin/env python
"""Rebuild all Aegis models and held-out metrics from the supplied CSV files."""

from __future__ import annotations

import json
import os
import random
from pathlib import Path
from typing import Any

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_DETERMINISTIC_OPS", "1")

import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_absolute_percentage_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import (
    GridSearchCV,
    StratifiedKFold,
    cross_val_predict,
    cross_val_score,
    train_test_split,
)
from sklearn.naive_bayes import MultinomialNB
from sklearn.neighbors import KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, PolynomialFeatures, StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier, export_text

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"
SEED = 42
WEATHER_ORDER = ["clear", "cloudy", "light_rain", "heavy_rain", "storm"]
HUBS = ["East Hub", "North Hub", "South Hub", "West Hub"]
CSV_FILES = {
    "cost": "01_linear_regression_shipping_cost.csv",
    "eta": "02_knn_delivery_time.csv",
    "risk": "03_svm_late_delivery_risk.csv",
    "failure": "04_decision_tree_first_attempt_failure.csv",
    "tickets": "05_naive_bayes_customer_messages.csv",
    "volume": "06_ann_daily_parcel_volume.csv",
}


def load_csv(filename: str, dtypes: dict[str, Any]) -> pd.DataFrame:
    path = DATA_DIR / filename
    if not path.is_file():
        raise FileNotFoundError(f"Required training data is missing: {path}")
    frame = pd.read_csv(path, dtype=dtypes)
    if frame.empty:
        raise ValueError(f"Training data contains no records: {path}")
    if frame.isna().any().any():
        missing = frame.columns[frame.isna().any()].tolist()
        raise ValueError(f"Missing values in {filename}: {', '.join(missing)}")
    return frame


def regression_metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    return {
        "mae": round(float(mean_absolute_error(actual, predicted)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(actual, predicted))), 4),
        "r2": round(float(r2_score(actual, predicted)), 5),
        "mape_pct": round(float(mean_absolute_percentage_error(actual, predicted) * 100), 4),
    }


def classification_metrics(actual: np.ndarray, predicted: np.ndarray, labels: list[Any]) -> dict[str, Any]:
    return {
        "accuracy": round(float(accuracy_score(actual, predicted)), 5),
        "precision_macro": round(float(precision_score(actual, predicted, average="macro", zero_division=0)), 5),
        "recall_macro": round(float(recall_score(actual, predicted, average="macro", zero_division=0)), 5),
        "f1_macro": round(float(f1_score(actual, predicted, average="macro", zero_division=0)), 5),
        "labels": [str(label) for label in labels],
        "confusion_matrix": confusion_matrix(actual, predicted, labels=labels).tolist(),
        "per_class": classification_report(
            actual, predicted, labels=labels, output_dict=True, zero_division=0
        ),
    }


def save_joblib(name: str, artifact: Any) -> None:
    joblib.dump(artifact, MODELS_DIR / name, compress=3)


def train_cost(metrics: dict[str, Any]) -> None:
    frame = load_csv(
        CSV_FILES["cost"],
        {
            "shipment_id": "string",
            "distance_km": "float64",
            "weight_kg": "float64",
            "number_of_stops": "int64",
            "fuel_price_php_per_liter": "float64",
            "actual_shipping_cost_php": "float64",
        },
    )
    features = ["distance_km", "weight_kg", "number_of_stops", "fuel_price_php_per_liter"]
    target = "actual_shipping_cost_php"
    x_train, x_test, y_train, y_test = train_test_split(
        frame[features], frame[target], test_size=0.2, random_state=SEED
    )

    linear = Pipeline(
        [("scaler", StandardScaler()), ("regressor", LinearRegression())]
    )
    linear.fit(x_train, y_train)
    linear_result = regression_metrics(y_test.to_numpy(), linear.predict(x_test))
    selected = linear
    selected_name = "linear"
    comparison: dict[str, Any] = {"linear": linear_result}

    if linear_result["mape_pct"] > 5:
        polynomial = Pipeline(
            [
                ("polynomial", PolynomialFeatures(degree=2, include_bias=False)),
                ("scaler", StandardScaler()),
                ("regressor", LinearRegression()),
            ]
        )
        polynomial.fit(x_train, y_train)
        polynomial_result = regression_metrics(y_test.to_numpy(), polynomial.predict(x_test))
        comparison["polynomial_degree_2"] = polynomial_result
        if polynomial_result["mape_pct"] < linear_result["mape_pct"]:
            selected = polynomial
            selected_name = "polynomial_degree_2"

    selected.fit(frame[features], frame[target])
    save_joblib("shipping_cost.joblib", selected)
    metrics["shipping_cost"] = {
        "algorithm": selected_name,
        "features": features,
        "target": target,
        "holdout_rows": len(y_test),
        "holdout": comparison[selected_name],
        "comparison": comparison,
        "within_5_percent_target": comparison[selected_name]["mape_pct"] <= 5,
    }


def train_eta(metrics: dict[str, Any]) -> None:
    frame = load_csv(
        CSV_FILES["eta"],
        {
            "shipment_id": "string",
            "route_type": "string",
            "area_type": "string",
            "time_of_day": "string",
            "parcel_size": "string",
            "distance_km": "float64",
            "traffic_level": "string",
            "actual_delivery_time_min": "float64",
        },
    )
    categorical = ["route_type", "area_type", "time_of_day", "parcel_size", "traffic_level"]
    numerical = ["distance_km"]
    features = categorical + numerical
    target = "actual_delivery_time_min"
    transformer = ColumnTransformer(
        [
            ("categories", OneHotEncoder(handle_unknown="ignore"), categorical),
            ("distance", StandardScaler(), numerical),
        ],
        remainder="drop",
    )
    pipeline = Pipeline(
        [
            ("preprocessor", transformer),
            ("regressor", KNeighborsRegressor(weights="distance", metric="euclidean", algorithm="brute")),
        ]
    )
    x_train, x_test, y_train, y_test, ids_train, _ = train_test_split(
        frame[features],
        frame[target],
        frame["shipment_id"],
        test_size=0.2,
        random_state=SEED,
    )
    search = GridSearchCV(
        pipeline,
        {"regressor__n_neighbors": [3, 5, 7, 9, 11, 15, 21]},
        cv=5,
        scoring="neg_mean_absolute_error",
        n_jobs=-1,
        refit=True,
    )
    search.fit(x_train, y_train)
    predictions = search.predict(x_test)
    search.best_estimator_.fit(frame[features], frame[target])
    save_joblib("delivery_time.joblib", search.best_estimator_)
    reference = {
        "shipment_ids": frame["shipment_id"].astype(str).tolist(),
        "delivery_times": frame[target].astype(float).tolist(),
        "distances_km": frame["distance_km"].astype(float).tolist(),
    }
    (MODELS_DIR / "eta_reference.json").write_text(json.dumps(reference), encoding="utf-8")
    metrics["delivery_time"] = {
        "algorithm": "KNeighborsRegressor",
        "best_k": int(search.best_params_["regressor__n_neighbors"]),
        "candidate_k": [3, 5, 7, 9, 11, 15, 21],
        "cv_mae_minutes": round(float(-search.best_score_), 4),
        "holdout_mae_minutes": round(float(mean_absolute_error(y_test, predictions)), 4),
        "holdout_rmse_minutes": round(float(np.sqrt(mean_squared_error(y_test, predictions))), 4),
        "holdout_rows": len(y_test),
        "features": features,
        "categories": {
            column: sorted(frame[column].astype(str).unique().tolist()) for column in categorical
        },
    }


def train_risk(metrics: dict[str, Any]) -> None:
    frame = load_csv(
        CSV_FILES["risk"],
        {
            "shipment_id": "string",
            "weather_conditions": "string",
            "hub_load_pct": "float64",
            "distance_km": "float64",
            "driver_workload_stops": "int64",
            "was_late": "int64",
        },
    )
    features = ["weather_conditions", "hub_load_pct", "distance_km", "driver_workload_stops"]
    target = "was_late"
    x = frame[features].copy()
    x["weather_conditions"] = pd.Categorical(
        x["weather_conditions"], categories=WEATHER_ORDER, ordered=True
    ).codes
    x_train, x_test, y_train, y_test = train_test_split(
        x, frame[target], test_size=0.2, random_state=SEED, stratify=frame[target]
    )
    pipeline = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("classifier", SVC(probability=True, class_weight="balanced", random_state=SEED)),
        ]
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    kernel_results: dict[str, float] = {}
    for kernel in ["rbf", "linear"]:
        candidate = pipeline.set_params(classifier__kernel=kernel)
        scores = cross_val_score(candidate, x_train, y_train, cv=cv, scoring="roc_auc", n_jobs=-1)
        kernel_results[kernel] = float(np.mean(scores))
    selected_kernel = max(kernel_results, key=kernel_results.get)
    pipeline.set_params(classifier__kernel=selected_kernel)
    oof_probabilities = cross_val_predict(
        pipeline, x_train, y_train, cv=cv, method="predict_proba", n_jobs=1
    )[:, 1]
    threshold_candidates = np.unique(
        np.concatenate([np.linspace(0.02, 0.98, 193), oof_probabilities])
    )
    threshold = max(
        threshold_candidates,
        key=lambda candidate: (
            f1_score(y_train, oof_probabilities >= candidate, zero_division=0),
            recall_score(y_train, oof_probabilities >= candidate, zero_division=0),
        ),
    )
    pipeline.fit(x_train, y_train)
    probabilities = pipeline.predict_proba(x_test)[:, list(pipeline.classes_).index(1)]
    predictions = (probabilities >= threshold).astype(int)
    metrics["late_risk"] = {
        "algorithm": "SVC",
        "selected_kernel": selected_kernel,
        "classification_threshold": round(float(threshold), 5),
        "cv_roc_auc_by_kernel": {key: round(value, 5) for key, value in kernel_results.items()},
        **classification_metrics(y_test.to_numpy(), predictions, [0, 1]),
        "late_class": {
            "precision": round(float(precision_score(y_test, predictions, pos_label=1, zero_division=0)), 5),
            "recall": round(float(recall_score(y_test, predictions, pos_label=1, zero_division=0)), 5),
            "f1": round(float(f1_score(y_test, predictions, pos_label=1, zero_division=0)), 5),
            "roc_auc": round(float(roc_auc_score(y_test, probabilities)), 5),
            "prevalence": round(float(frame[target].mean()), 5),
        },
        "holdout_rows": len(y_test),
        "weather_order": WEATHER_ORDER,
        "feature_names": features,
    }
    pipeline.fit(x, frame[target])
    save_joblib("late_risk.joblib", pipeline)
    (MODELS_DIR / "risk_threshold.json").write_text(
        json.dumps({"threshold": float(threshold)}), encoding="utf-8"
    )
    reference = {
        "weather_conditions": str(frame["weather_conditions"].mode().iloc[0]),
        "hub_load_pct": float(frame["hub_load_pct"].median()),
        "distance_km": float(frame["distance_km"].median()),
        "driver_workload_stops": float(frame["driver_workload_stops"].median()),
    }
    (MODELS_DIR / "risk_reference.json").write_text(json.dumps(reference), encoding="utf-8")
    network_rows = frame[
        ["shipment_id", "weather_conditions", "hub_load_pct", "distance_km", "driver_workload_stops"]
    ].tail(12)
    (MODELS_DIR / "network_records.json").write_text(
        network_rows.rename(
            columns={"driver_workload_stops": "workload_stops"}
        ).to_json(orient="records"),
        encoding="utf-8",
    )


def train_failure(metrics: dict[str, Any]) -> None:
    frame = load_csv(
        CSV_FILES["failure"],
        {
            "shipment_id": "string",
            "address_type": "string",
            "delivery_time_slot": "string",
            "day_type": "string",
            "previous_failed_deliveries": "int64",
            "customer_responded": "int64",
            "first_attempt_failed": "int64",
        },
    )
    categorical = ["address_type", "delivery_time_slot", "day_type"]
    numerical = ["previous_failed_deliveries", "customer_responded"]
    features = categorical + numerical
    target = "first_attempt_failed"
    transformer = ColumnTransformer(
        [
            ("categories", OneHotEncoder(handle_unknown="ignore"), categorical),
            ("numeric", "passthrough", numerical),
        ],
        remainder="drop",
    )
    pipeline = Pipeline(
        [
            ("preprocessor", transformer),
            ("classifier", DecisionTreeClassifier(max_depth=6, class_weight="balanced", random_state=SEED)),
        ]
    )
    x_train, x_test, y_train, y_test = train_test_split(
        frame[features],
        frame[target],
        test_size=0.2,
        random_state=SEED,
        stratify=frame[target],
    )
    pipeline.fit(x_train, y_train)
    predicted = pipeline.predict(x_test)
    holdout = classification_metrics(y_test.to_numpy(), predicted, [0, 1])
    pipeline.fit(frame[features], frame[target])
    save_joblib("first_attempt_failure.joblib", pipeline)
    example = frame.iloc[0][features].to_dict()
    example["previous_failed_deliveries"] = int(example["previous_failed_deliveries"])
    example["customer_responded"] = int(example["customer_responded"])
    (MODELS_DIR / "failure_example.json").write_text(
        json.dumps(example), encoding="utf-8"
    )
    preprocessor = pipeline.named_steps["preprocessor"]
    classifier = pipeline.named_steps["classifier"]
    names = preprocessor.get_feature_names_out().tolist()
    rules = export_text(classifier, feature_names=names, max_depth=6)
    (MODELS_DIR / "decision_tree_rules.txt").write_text(rules, encoding="utf-8")
    importance = sorted(
        [
            {"feature": name, "importance": float(value)}
            for name, value in zip(names, classifier.feature_importances_)
            if value > 0
        ],
        key=lambda row: row["importance"],
        reverse=True,
    )
    metrics["first_attempt_failure"] = {
        "algorithm": "DecisionTreeClassifier",
        "max_depth": int(classifier.get_depth()),
        "holdout_rows": len(y_test),
        **holdout,
        "feature_importance": importance,
        "rule_file": "decision_tree_rules.txt",
        "categories": {column: sorted(frame[column].unique().tolist()) for column in categorical},
        "numeric_ranges": {
            "previous_failed_deliveries": [int(frame["previous_failed_deliveries"].min()), int(frame["previous_failed_deliveries"].max())],
            "customer_responded": [int(frame["customer_responded"].min()), int(frame["customer_responded"].max())],
        },
    }


def train_tickets(metrics: dict[str, Any]) -> None:
    frame = load_csv(
        CSV_FILES["tickets"],
        {"ticket_id": "string", "message_text": "string", "category": "string"},
    )
    x_train, x_test, y_train, y_test = train_test_split(
        frame["message_text"],
        frame["category"],
        test_size=0.2,
        random_state=SEED,
        stratify=frame["category"],
    )
    pipeline = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True)),
            ("classifier", MultinomialNB()),
        ]
    )
    pipeline.fit(x_train, y_train)
    predicted = pipeline.predict(x_test)
    labels = sorted(frame["category"].unique().tolist())
    report = classification_metrics(y_test.to_numpy(), predicted, labels)
    pipeline.fit(frame["message_text"], frame["category"])
    save_joblib("customer_messages.joblib", pipeline)
    metrics["customer_messages"] = {
        "algorithm": "TfidfVectorizer + MultinomialNB",
        "holdout_rows": len(y_test),
        **report,
        "categories": labels,
        "department_by_category": {
            "damaged_parcel": "Claims & care",
            "address_problem": "Address resolution",
            "tracking_request": "Shipment tracking",
            "missing_parcel": "Shipment investigation",
            "reschedule_request": "Delivery coordination",
            "shipping_fee": "Billing & payments",
        },
    }


def volume_features(frame: pd.DataFrame, encoder: OneHotEncoder) -> np.ndarray:
    numeric = frame[
        [
            "day_of_week",
            "month",
            "promotion_index",
            "weather_severity",
            "holiday_flag",
            "parcel_volume_lag_1",
            "parcel_volume_lag_7",
            "rolling_7day_avg",
        ]
    ].to_numpy(dtype=np.float64)
    hubs = encoder.transform(frame[["hub"]])
    return np.column_stack([numeric, hubs])


def train_volume(metrics: dict[str, Any]) -> None:
    frame = load_csv(
        CSV_FILES["volume"],
        {
            "date": "string",
            "hub": "string",
            "day_of_week": "int64",
            "month": "int64",
            "promotion_index": "float64",
            "weather_severity": "float64",
            "holiday_flag": "int64",
            "parcel_volume_lag_1": "float64",
            "parcel_volume_lag_7": "float64",
            "rolling_7day_avg": "float64",
            "parcel_volume": "float64",
        },
    )
    frame["date"] = pd.to_datetime(frame["date"], format="%Y-%m-%d", errors="raise")
    frame = frame.sort_values(["date", "hub"], kind="stable").reset_index(drop=True)
    train_mask = frame["date"] < pd.Timestamp("2025-10-01")
    train_frame = frame.loc[train_mask].copy()
    test_frame = frame.loc[~train_mask].copy()
    if train_frame.empty or test_frame.empty:
        raise ValueError("Volume dataset must contain records both before and after 2025-10-01.")
    if test_frame["date"].min() < pd.Timestamp("2025-10-01"):
        raise ValueError("Volume test split overlaps the training window.")

    hub_encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    hub_encoder.fit(frame[["hub"]])
    x_train = volume_features(train_frame, hub_encoder)
    x_test = volume_features(test_frame, hub_encoder)
    target_train = train_frame["parcel_volume"].to_numpy(dtype=np.float64)
    target_test = test_frame["parcel_volume"].to_numpy(dtype=np.float64)
    scaler = StandardScaler()
    x_train_scaled = scaler.fit_transform(x_train)
    x_test_scaled = scaler.transform(x_test)

    tf.keras.utils.set_random_seed(SEED)
    tf.config.experimental.enable_op_determinism()
    network = tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=(x_train_scaled.shape[1],)),
            tf.keras.layers.Dense(64, activation="relu"),
            tf.keras.layers.Dense(32, activation="relu"),
            tf.keras.layers.Dense(1),
        ],
        name="aegis_daily_volume_forecaster",
    )
    network.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), loss="mae")
    validation_start = int(len(x_train_scaled) * 0.9)
    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=15, restore_best_weights=True
        )
    ]
    network.fit(
        x_train_scaled[:validation_start],
        target_train[:validation_start],
        validation_data=(x_train_scaled[validation_start:], target_train[validation_start:]),
        epochs=200,
        batch_size=64,
        shuffle=False,
        callbacks=callbacks,
        verbose=0,
    )
    predictions = network.predict(x_test_scaled, verbose=0).reshape(-1)
    errors = np.abs(target_test - predictions)
    volume_result = {
        "mae": round(float(mean_absolute_error(target_test, predictions)), 3),
        "mape_pct": round(float(mean_absolute_percentage_error(target_test, predictions) * 100), 3),
        "rmse": round(float(np.sqrt(mean_squared_error(target_test, predictions))), 3),
        "holdout_rows": int(len(test_frame)),
        "holdout_start": test_frame["date"].min().strftime("%Y-%m-%d"),
        "holdout_end": test_frame["date"].max().strftime("%Y-%m-%d"),
        "train_end": train_frame["date"].max().strftime("%Y-%m-%d"),
        "interval_abs_error_90th": round(float(np.quantile(errors, 0.9)), 3),
        "holdout_error_series": [
            {"date": day.strftime("%Y-%m-%d"), "mae": round(float(np.mean(errors[test_frame["date"].to_numpy() == day])), 3)}
            for day in sorted(test_frame["date"].unique())
        ],
    }

    full_x = volume_features(frame, hub_encoder)
    full_scaler = StandardScaler().fit(full_x)
    full_x_scaled = full_scaler.transform(full_x)
    final_network = tf.keras.models.clone_model(network)
    final_network.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), loss="mae")
    full_validation_start = int(len(full_x_scaled) * 0.9)
    final_network.fit(
        full_x_scaled[:full_validation_start],
        frame["parcel_volume"].to_numpy(dtype=np.float64)[:full_validation_start],
        validation_data=(
            full_x_scaled[full_validation_start:],
            frame["parcel_volume"].to_numpy(dtype=np.float64)[full_validation_start:],
        ),
        epochs=max(20, len(network.history.epoch)),
        batch_size=64,
        shuffle=False,
        callbacks=callbacks,
        verbose=0,
    )
    final_network.save(MODELS_DIR / "ann_daily_parcel_volume.h5", include_optimizer=False)
    save_joblib("volume_scaler.joblib", full_scaler)
    save_joblib("volume_hubs.joblib", hub_encoder)
    last_rows = (
        frame.sort_values("date")
        .groupby("hub", sort=True)
        .tail(7)
        .sort_values(["hub", "date"], kind="stable")
    )
    histories = {
        hub: group["parcel_volume"].astype(float).tolist()
        for hub, group in last_rows.groupby("hub", sort=True)
    }
    chart_history = {
        hub: [
            {"date": row.date.strftime("%Y-%m-%d"), "volume": int(row.parcel_volume)}
            for row in group.tail(45).itertuples()
        ]
        for hub, group in frame.sort_values("date").groupby("hub", sort=True)
    }
    metadata = {
        "hubs": hub_encoder.categories_[0].tolist(),
        "latest_date": frame["date"].max().strftime("%Y-%m-%d"),
        "histories": histories,
        "history": chart_history,
        "holiday_month_days": sorted(
            frame.loc[frame["holiday_flag"] == 1, "date"].dt.strftime("%m-%d").unique().tolist()
        ),
        "input_features": [
            "day_of_week",
            "month",
            "promotion_index",
            "weather_severity",
            "holiday_flag",
            "parcel_volume_lag_1",
            "parcel_volume_lag_7",
            "rolling_7day_avg",
            "hub_one_hot",
        ],
    }
    (MODELS_DIR / "volume_metadata.json").write_text(json.dumps(metadata), encoding="utf-8")
    metrics["daily_volume"] = {
        "algorithm": "Keras feed-forward neural network",
        "features": metadata["input_features"],
        "hubs": metadata["hubs"],
        **volume_result,
    }


def main() -> None:
    random.seed(SEED)
    np.random.seed(SEED)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    metrics: dict[str, Any] = {
        "training_seed": SEED,
        "datasets": {},
    }
    for key, filename in CSV_FILES.items():
        path = DATA_DIR / filename
        if not path.is_file():
            raise FileNotFoundError(f"Required training data is missing: {path}")
        metrics["datasets"][key] = {
            "file": filename,
            "rows": int(sum(1 for _ in path.open(encoding="utf-8")) - 1),
        }

    train_cost(metrics)
    train_eta(metrics)
    train_risk(metrics)
    train_failure(metrics)
    train_tickets(metrics)
    train_volume(metrics)
    (MODELS_DIR / "metrics.json").write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({key: value for key, value in metrics.items() if key != "datasets"}, indent=2))
    print(f"\nSaved trained artifacts and metrics to {MODELS_DIR}")


if __name__ == "__main__":
    main()
