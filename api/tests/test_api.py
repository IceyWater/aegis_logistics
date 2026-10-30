from fastapi.testclient import TestClient

from app.main import app


def test_health_and_metrics_load_real_artifacts() -> None:
    with TestClient(app) as client:
        assert client.get("/api/health").json() == {
            "status": "ready",
            "models_loaded": 6,
        }
        metrics = client.get("/api/metrics").json()
        assert metrics["datasets"]["cost"]["rows"] == 3000
        assert metrics["datasets"]["tickets"]["rows"] == 3600


def test_cost_quote_is_a_trained_model_prediction() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/quote",
            json={
                "distance_km": 22.99,
                "weight_kg": 4.9,
                "stops": 12,
                "fuel_price": 56.63,
            },
        )
        assert response.status_code == 200
        assert response.json()["predicted_cost_php"] > 0
        assert response.json()["mape_pct"] == client.get(
            "/api/metrics"
        ).json()["shipping_cost"]["holdout"]["mape_pct"]


def test_eta_returns_real_neighbor_ids_and_overrides_k() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/eta",
            json={
                "route_type": "suburban",
                "area_type": "suburban",
                "time_of_day": "morning",
                "parcel_size": "small",
                "distance_km": 12.01,
                "traffic_level": "medium",
                "k": 3,
            },
        )
        assert response.status_code == 200
        assert response.json()["k"] == 3
        assert len(response.json()["neighbors"]) == 3
        assert response.json()["neighbors"][0]["shipment_id"].startswith("ETA")


def test_late_risk_exposes_probability_and_explanations() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/risk",
            json={
                "weather": "storm",
                "hub_load_pct": 100,
                "distance_km": 107.75,
                "workload_stops": 24,
            },
        )
        assert response.status_code == 200
        assert 0 <= response.json()["probability"] <= 100
        assert response.json()["top_contributing_factors"]


def test_failure_rule_path_uses_fitted_tree() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/failure",
            json={
                "address_type": "apartment",
                "delivery_time_slot": "evening",
                "day_type": "weekend",
                "previous_failed_deliveries": 3,
                "customer_responded": 0,
            },
        )
        assert response.status_code == 200
        assert response.json()["prediction"] in {
            "LIKELY TO FAIL",
            "LIKELY TO SUCCEED",
        }
        assert response.json()["rule_path"]

        example = client.get("/api/failure/example")
        assert example.status_code == 200
        assert example.json()["input"]
        assert example.json()["rule_path"]

        rules = client.get("/api/failure/rules")
        assert rules.status_code == 200
        assert "class:" in rules.json()["rules"]
        assert rules.json()["feature_importance"]


def test_ticket_triage_returns_three_model_probabilities() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/triage",
            json={
                "message_text": "My damaged parcel arrived torn and the contents are unusable"
            },
        )
        assert response.status_code == 200
        assert len(response.json()["predictions"]) == 3
        assert response.json()["predictions"][0]["category"] == "damaged_parcel"


def test_forecast_recursively_returns_staffing_recommendation() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/forecast",
            json={
                "hub": "North Hub",
                "horizon_days": 7,
                "promotion_level": 0.8,
                "weather_assumption": "storm",
            },
        )
        assert response.status_code == 200
        assert len(response.json()["forecast"]) == 7
        assert response.json()["recommended_couriers"] >= 1


def test_api_rejects_out_of_range_features() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/quote",
            json={
                "distance_km": 500,
                "weight_kg": 4.0,
                "stops": 1,
                "fuel_price": 60,
            },
        )
        assert response.status_code == 422


def test_network_and_csv_download_use_supplied_records() -> None:
    with TestClient(app) as client:
        network = client.get("/api/network")
        assert network.status_code == 200
        assert len(network.json()["shipments"]) == 12

        dataset = client.get(
            "/api/datasets/03_svm_late_delivery_risk.csv"
        )
        assert dataset.status_code == 200
        assert dataset.text.startswith("shipment_id,weather_conditions")
        assert client.get("/api/datasets/..%2F..%2FREADME.md").status_code == 404
