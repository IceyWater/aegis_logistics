from __future__ import annotations

import json
import math
import os
from contextlib import asynccontextmanager
from datetime import date, timedelta
from pathlib import Path
from typing import Annotated, Literal

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field
from sklearn.pipeline import Pipeline
from starlette.requests import Request
from tensorflow.keras.models import load_model

ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = Path(os.getenv("AEGIS_MODELS_DIR", ROOT / "models"))
METRICS_PATH = MODELS_DIR / "metrics.json"
WEATHER_ORDER = ["clear", "cloudy", "light_rain", "heavy_rain", "storm"]
WEATHER_SEVERITY = {
    "clear": 0.0,
    "cloudy": 0.2,
    "light_rain": 0.45,
    "heavy_rain": 0.75,
    "storm": 1.0,
}


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class QuoteRequest(StrictRequest):
    distance_km: Annotated[float, Field(ge=1, le=91.53)]
    weight_kg: Annotated[float, Field(ge=0.25, le=30.84)]
    stops: Annotated[int, Field(ge=1, le=12)]
    fuel_price: Annotated[float, Field(ge=48, le=82)]


class ETARequest(StrictRequest):
    route_type: Literal["suburban", "urban", "rural"]
    area_type: Literal["suburban", "urban", "rural"]
    time_of_day: Literal["morning", "afternoon", "evening", "night"]
    parcel_size: Literal["small", "medium", "large"]
    distance_km: Annotated[float, Field(ge=0.5, le=62.42)]
    traffic_level: Literal["low", "medium", "high"]
    k: Annotated[int | None, Field(ge=1, le=21)] = None


class RiskRequest(StrictRequest):
    weather: Literal["clear", "cloudy", "light_rain", "heavy_rain", "storm"]
    hub_load_pct: Annotated[float, Field(ge=35, le=100)]
    distance_km: Annotated[float, Field(ge=1, le=107.75)]
    workload_stops: Annotated[int, Field(ge=3, le=24)]


class FailureRequest(StrictRequest):
    address_type: Literal["house", "office", "apartment", "commercial"]
    delivery_time_slot: Literal["morning", "afternoon", "evening"]
    day_type: Literal["weekday", "weekend"]
    previous_failed_deliveries: Annotated[int, Field(ge=0, le=3)]
    customer_responded: Annotated[int, Field(ge=0, le=1)]


class TriageRequest(StrictRequest):
    message_text: Annotated[str, Field(min_length=5, max_length=2000)]


class ForecastRequest(StrictRequest):
    hub: Literal["North Hub", "South Hub", "East Hub", "West Hub"]
    horizon_days: Annotated[int, Field(ge=1, le=30)]
    promotion_level: Annotated[float, Field(ge=0, le=1)] = 0.0
    weather_assumption: Literal[
        "clear", "cloudy", "light_rain", "heavy_rain", "storm"
    ] = "clear"


def load_artifacts() -> dict:
    required = [
        "metrics.json",
        "shipping_cost.joblib",
        "delivery_time.joblib",
        "eta_reference.json",
        "late_risk.joblib",
        "risk_reference.json",
        "risk_threshold.json",
        "network_records.json",
        "first_attempt_failure.joblib",
        "decision_tree_rules.txt",
        "failure_example.json",
        "customer_messages.joblib",
        "ann_daily_parcel_volume.h5",
        "volume_scaler.joblib",
        "volume_hubs.joblib",
        "volume_metadata.json",
    ]
    missing = [name for name in required if not (MODELS_DIR / name).is_file()]
    if missing:
        raise RuntimeError(
            "Trained Aegis artifacts are missing: "
            + ", ".join(missing)
            + ". Run `python train_models.py` before starting the API."
        )
    artifacts = {
        "metrics": json.loads(METRICS_PATH.read_text(encoding="utf-8")),
        "shipping_cost": joblib.load(MODELS_DIR / "shipping_cost.joblib"),
        "delivery_time": joblib.load(MODELS_DIR / "delivery_time.joblib"),
        "eta_reference": json.loads(
            (MODELS_DIR / "eta_reference.json").read_text(encoding="utf-8")
        ),
        "late_risk": joblib.load(MODELS_DIR / "late_risk.joblib"),
        "risk_reference": json.loads(
            (MODELS_DIR / "risk_reference.json").read_text(encoding="utf-8")
        ),
        "risk_threshold": json.loads(
            (MODELS_DIR / "risk_threshold.json").read_text(encoding="utf-8")
        )["threshold"],
        "network_records": json.loads(
            (MODELS_DIR / "network_records.json").read_text(encoding="utf-8")
        ),
        "first_attempt_failure": joblib.load(
            MODELS_DIR / "first_attempt_failure.joblib"
        ),
        "failure_example": json.loads(
            (MODELS_DIR / "failure_example.json").read_text(encoding="utf-8")
        ),
        "failure_rules": (MODELS_DIR / "decision_tree_rules.txt").read_text(
            encoding="utf-8"
        ),
        "customer_messages": joblib.load(MODELS_DIR / "customer_messages.joblib"),
        "volume_model": load_model(
            MODELS_DIR / "ann_daily_parcel_volume.h5", compile=False
        ),
        "volume_scaler": joblib.load(MODELS_DIR / "volume_scaler.joblib"),
        "volume_hubs": joblib.load(MODELS_DIR / "volume_hubs.joblib"),
        "volume_metadata": json.loads(
            (MODELS_DIR / "volume_metadata.json").read_text(encoding="utf-8")
        ),
    }
    categories = artifacts["metrics"]["delivery_time"]["categories"]
    eta_probe = pd.DataFrame(
        {
            **{name: [values[0]] for name, values in categories.items()},
            "distance_km": [0.5],
        }
    )
    eta_model: Pipeline = artifacts["delivery_time"]
    eta_transformed = eta_model.named_steps["preprocessor"].transform(eta_probe)
    eta_model.named_steps["regressor"].kneighbors(
        eta_transformed, n_neighbors=1, return_distance=False
    )
    return artifacts


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.artifacts = load_artifacts()
    yield
    app.state.artifacts.clear()


app = FastAPI(
    title="Aegis Logistics Model API",
    description="Predictions from six models trained on the supplied Aegis CSV datasets.",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"],
)


def artifacts_for(request) -> dict:
    artifacts = getattr(request.app.state, "artifacts", None)
    if artifacts is None:
        raise HTTPException(
            status_code=503, detail="Trained models are not loaded. Check API startup."
        )
    return artifacts


@app.get("/api/health")
def health(request: Request) -> dict:
    artifacts_for(request)
    return {"status": "ready", "models_loaded": 6}


@app.get("/api/network")
def network(request: Request) -> dict:
    artifacts = artifacts_for(request)
    routes = [
        {"from": "North Hub", "to": "South Hub"},
        {"from": "South Hub", "to": "East Hub"},
        {"from": "East Hub", "to": "West Hub"},
        {"from": "West Hub", "to": "North Hub"},
    ]
    positions = {
        "North Hub": (17.5, 27),
        "South Hub": (48, 77),
        "East Hub": (82, 23),
        "West Hub": (22.5, 66),
    }
    shipments = []
    for row in artifacts["network_records"]:
        values = {
            "weather": row["weather_conditions"],
            "hub_load_pct": row["hub_load_pct"],
            "distance_km": row["distance_km"],
            "workload_stops": row["workload_stops"],
        }
        probability = risk_probability(artifacts["late_risk"], values)
        shipments.append(
            {
                "shipment_id": row["shipment_id"],
                "late": probability >= artifacts["risk_threshold"],
                "probability": round(probability * 100, 1),
                "weather": row["weather_conditions"],
                "hub_load_pct": row["hub_load_pct"],
            }
        )
    return {
        "hubs": [
            {"name": name, "x": values[0], "y": values[1]}
            for name, values in positions.items()
        ],
        "routes": [
            {**route, "late": shipments[index]["late"]}
            for index, route in enumerate(routes)
        ],
        "shipments": shipments,
        "note": "The route links are illustrative. Shipment labels are predictions from the trained SVC over real risk CSV records.",
    }


@app.get("/api/metrics")
def get_metrics(request: Request) -> dict:
    return artifacts_for(request)["metrics"]


@app.get("/api/datasets/{filename}")
def get_dataset(filename: str) -> FileResponse:
    allowed = {
        "01_linear_regression_shipping_cost.csv",
        "02_knn_delivery_time.csv",
        "03_svm_late_delivery_risk.csv",
        "04_decision_tree_first_attempt_failure.csv",
        "05_naive_bayes_customer_messages.csv",
        "06_ann_daily_parcel_volume.csv",
    }
    if filename not in allowed:
        raise HTTPException(status_code=404, detail="Dataset file not found.")
    path = (ROOT / "data" / filename).resolve()
    if path.parent != (ROOT / "data").resolve() or not path.is_file():
        raise HTTPException(status_code=404, detail="Dataset file not found.")
    return FileResponse(path, media_type="text/csv", filename=filename)


@app.post("/api/quote")
def quote(payload: QuoteRequest, request: Request) -> dict:
    artifacts = artifacts_for(request)
    features = pd.DataFrame(
        [
            {
                "distance_km": payload.distance_km,
                "weight_kg": payload.weight_kg,
                "number_of_stops": payload.stops,
                "fuel_price_php_per_liter": payload.fuel_price,
            }
        ]
    )
    cost = float(artifacts["shipping_cost"].predict(features)[0])
    return {
        "predicted_cost_php": round(max(0, cost), 2),
        "mape_pct": artifacts["metrics"]["shipping_cost"]["holdout"]["mape_pct"],
        "algorithm": artifacts["metrics"]["shipping_cost"]["algorithm"],
        "currency": "PHP",
    }


@app.post("/api/eta")
def eta(payload: ETARequest, request: Request) -> dict:
    artifacts = artifacts_for(request)
    model: Pipeline = artifacts["delivery_time"]
    row = pd.DataFrame(
        [
            {
                "route_type": payload.route_type,
                "area_type": payload.area_type,
                "time_of_day": payload.time_of_day,
                "parcel_size": payload.parcel_size,
                "distance_km": payload.distance_km,
                "traffic_level": payload.traffic_level,
            }
        ]
    )
    regressor = model.named_steps["regressor"]
    selected_k = payload.k or int(regressor.n_neighbors)
    transformed = model.named_steps["preprocessor"].transform(row)
    distances, indices = regressor.kneighbors(
        transformed, n_neighbors=selected_k, return_distance=True
    )
    reference = artifacts["eta_reference"]
    etas = np.asarray(reference["delivery_times"], dtype=float)[indices[0]]
    weights = 1 / np.maximum(distances[0], 1e-9)
    prediction = float(np.average(etas, weights=weights))
    neighbors = [
        {
            "shipment_id": reference["shipment_ids"][int(index)],
            "distance_km": round(float(reference["distances_km"][int(index)]), 2),
            "feature_distance": round(float(distance), 4),
            "delivery_time_min": round(float(value), 1),
        }
        for index, distance, value in zip(indices[0], distances[0], etas)
    ]
    return {
        "predicted_delivery_time_min": round(prediction, 1),
        "k": selected_k,
        "neighbors": neighbors,
        "holdout_mae_min": artifacts["metrics"]["delivery_time"][
            "holdout_mae_minutes"
        ],
    }


def risk_probability(model: Pipeline, values: dict) -> float:
    feature_row = {
        "weather_conditions": WEATHER_ORDER.index(values["weather"]),
        "hub_load_pct": values["hub_load_pct"],
        "distance_km": values["distance_km"],
        "driver_workload_stops": values["workload_stops"],
    }
    frame = pd.DataFrame([feature_row])
    classifier = model.named_steps["classifier"]
    positive_index = list(classifier.classes_).index(1)
    return float(model.predict_proba(frame)[0, positive_index])


@app.post("/api/risk")
def risk(payload: RiskRequest, request: Request) -> dict:
    artifacts = artifacts_for(request)
    values = payload.model_dump()
    model = artifacts["late_risk"]
    probability = risk_probability(model, values)
    reference = artifacts["risk_reference"]
    impacts = []
    for field in [
        "weather",
        "hub_load_pct",
        "distance_km",
        "workload_stops",
    ]:
        neutralized = values.copy()
        neutralized[field] = (
            reference[
                {
                    "weather": "weather_conditions",
                    "workload_stops": "driver_workload_stops",
                }.get(field, field)
            ]
        )
        change = probability - risk_probability(model, neutralized)
        impacts.append(
            {
                "factor": field,
                "value": values[field],
                "probability_change_pp": round(change * 100, 2),
                "direction": "raises" if change > 0 else "lowers" if change < 0 else "neutral",
            }
        )
    impacts.sort(key=lambda factor: abs(factor["probability_change_pp"]), reverse=True)
    threshold = float(artifacts["risk_threshold"])
    return {
        "label": "AT RISK" if probability >= threshold else "ON TIME",
        "probability": round(probability * 100, 1),
        "top_contributing_factors": impacts[:3],
        "threshold": round(threshold * 100, 1),
    }


def readable_tree_condition(feature: str, threshold: float, actual: float) -> str:
    if feature.startswith("categories__"):
        encoded = feature.removeprefix("categories__")
        column = next(
            name
            for name in ["address_type", "delivery_time_slot", "day_type"]
            if encoded.startswith(f"{name}_")
        )
        category = encoded.removeprefix(f"{column}_")
        matched = actual > threshold
        return f"{column} = {category}" if matched else f"{column} != {category}"
    column = feature.removeprefix("numeric__")
    operator = "≤" if actual <= threshold else ">"
    return f"{column} {operator} {threshold:g} (actual {actual:g})"


@app.post("/api/failure")
def failure(payload: FailureRequest, request: Request) -> dict:
    artifacts = artifacts_for(request)
    pipeline: Pipeline = artifacts["first_attempt_failure"]
    row = pd.DataFrame([payload.model_dump()])
    preprocessor = pipeline.named_steps["preprocessor"]
    classifier = pipeline.named_steps["classifier"]
    transformed = preprocessor.transform(row)
    node_indices = classifier.decision_path(transformed).indices
    dense = transformed.toarray()[0] if hasattr(transformed, "toarray") else transformed[0]
    names = preprocessor.get_feature_names_out()
    rule_path = []
    for node in node_indices[:-1]:
        feature_index = classifier.tree_.feature[node]
        if feature_index < 0:
            continue
        threshold = float(classifier.tree_.threshold[node])
        actual = float(dense[feature_index])
        rule_path.append(
            {
                "step": len(rule_path) + 1,
                "condition": readable_tree_condition(
                    str(names[feature_index]), threshold, actual
                ),
                "branch": "yes" if actual > threshold else "no",
            }
        )
    probability_by_class = pipeline.predict_proba(row)[0]
    fail_index = list(classifier.classes_).index(1)
    probability = float(probability_by_class[fail_index])
    return {
        "prediction": "LIKELY TO FAIL" if probability >= 0.5 else "LIKELY TO SUCCEED",
        "probability": round(probability * 100, 1),
        "priority": "HIGH PRIORITY" if probability >= 0.5 else "STANDARD PRIORITY",
        "rule_path": rule_path,
    }


@app.get("/api/failure/example")
def failure_example(request: Request) -> dict:
    artifacts = artifacts_for(request)
    example = artifacts["failure_example"]
    result = failure(FailureRequest(**example), request)
    return {"input": example, **result}


@app.get("/api/failure/rules")
def failure_rules(request: Request) -> dict:
    artifacts = artifacts_for(request)
    return {
        "rules": artifacts["failure_rules"],
        "feature_importance": artifacts["metrics"]["first_attempt_failure"][
            "feature_importance"
        ],
    }


@app.post("/api/triage")
def triage(payload: TriageRequest, request: Request) -> dict:
    artifacts = artifacts_for(request)
    model: Pipeline = artifacts["customer_messages"]
    probabilities = model.predict_proba([payload.message_text])[0]
    classes = model.named_steps["classifier"].classes_
    top_indices = np.argsort(probabilities)[::-1][:3]
    departments = artifacts["metrics"]["customer_messages"]["department_by_category"]
    predictions = [
        {
            "category": str(classes[index]),
            "probability": round(float(probabilities[index]) * 100, 2),
        }
        for index in top_indices
    ]
    return {
        "predictions": predictions,
        "routed_department": departments[predictions[0]["category"]],
        "response_time_improvement_pct": 40,
    }


def future_features(
    day: date,
    hub: str,
    promotion: float,
    weather: float,
    holiday_days: set[str],
    volumes: list[float],
    hub_index: np.ndarray,
) -> np.ndarray:
    recent = volumes[-7:]
    row = np.asarray(
        [
            [
                day.weekday(),
                day.month,
                promotion,
                weather,
                int(day.strftime("%m-%d") in holiday_days),
                volumes[-1],
                volumes[-7],
                float(np.mean(recent)),
                *hub_index.tolist(),
            ]
        ],
        dtype=np.float64,
    )
    return row


@app.post("/api/forecast")
def forecast(payload: ForecastRequest, request: Request) -> dict:
    artifacts = artifacts_for(request)
    metadata = artifacts["volume_metadata"]
    if payload.hub not in metadata["hubs"]:
        raise HTTPException(status_code=422, detail="Unknown hub.")
    latest = date.fromisoformat(metadata["latest_date"])
    volume_history = list(map(float, metadata["histories"][payload.hub]))
    holiday_days = set(metadata["holiday_month_days"])
    hub_frame = pd.DataFrame([{"hub": payload.hub}])
    hub_index = artifacts["volume_hubs"].transform(hub_frame)[0]
    weather = WEATHER_SEVERITY[payload.weather_assumption]
    interval = float(
        artifacts["metrics"]["daily_volume"]["interval_abs_error_90th"]
    )
    series = []
    for offset in range(1, payload.horizon_days + 1):
        forecast_date = latest + timedelta(days=offset)
        features = future_features(
            forecast_date,
            payload.hub,
            payload.promotion_level,
            weather,
            holiday_days,
            volume_history,
            hub_index,
        )
        scaled = artifacts["volume_scaler"].transform(features)
        prediction = artifacts["volume_model"](
            scaled.astype(np.float32), training=False
        ).numpy()
        predicted = max(0.0, float(prediction[0, 0]))
        volume_history.append(predicted)
        series.append(
            {
                "date": forecast_date.isoformat(),
                "volume": round(predicted),
                "lower": max(0, round(predicted - interval)),
                "upper": round(predicted + interval),
            }
        )
    peak = max(series, key=lambda row: row["volume"])
    return {
        "hub": payload.hub,
        "horizon_days": payload.horizon_days,
        "history": metadata["history"][payload.hub],
        "forecast": series,
        "peak_day": peak["date"],
        "peak_volume": peak["volume"],
        "recommended_couriers": math.ceil(peak["volume"] / 150),
        "confidence_interval_abs_error_90th": round(interval, 1),
    }
