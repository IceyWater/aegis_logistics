<?php

namespace Tests\Feature;

use Tests\TestCase;

class LogisticsDemoTest extends TestCase
{
    public function test_health_and_model_catalog_are_available(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('status', 'ready')
            ->assertJsonPath('models', 6);

        $this->getJson('/api/models')
            ->assertOk()
            ->assertJsonCount(6, 'models');
    }

    public function test_all_demo_pages_render(): void
    {
        foreach (['/', '/quote', '/risk', '/triage', '/forecast', '/analytics', '/about'] as $path) {
            $this->get($path)->assertOk();
        }
    }

    public function test_quote_endpoint_returns_regression_and_knn_predictions(): void
    {
        $input = ['distance_km' => 128, 'weight_kg' => 4.5, 'stops' => 3];

        $this->postJson('/api/quote', $input)
            ->assertOk()
            ->assertJsonPath('model', 'regression')
            ->assertJsonStructure(['price', 'eta' => ['min', 'max'], 'confidence', 'neighbors']);

        $this->postJson('/api/quote', [...$input, 'model' => 'knn'])
            ->assertOk()
            ->assertJsonPath('model', 'knn')
            ->assertJsonCount(5, 'neighbors');
    }

    public function test_quote_validation_rejects_out_of_range_inputs(): void
    {
        $this->postJson('/api/quote', ['distance_km' => 900, 'weight_kg' => 4.5, 'stops' => 3])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('distance_km');
    }

    public function test_risk_endpoint_returns_a_decision_path_and_actions(): void
    {
        $this->postJson('/api/risk', ['weather' => 'storm', 'hub_load' => 'high', 'distance_km' => 500])
            ->assertOk()
            ->assertJsonPath('status', 'AT RISK')
            ->assertJsonStructure(['status', 'probability', 'on_time_probability', 'factors', 'priority', 'decision_path', 'actions']);

        $this->postJson('/api/risk', ['weather' => 'clear', 'hub_load' => 'low', 'distance_km' => 1])
            ->assertOk()
            ->assertJsonPath('status', 'ON TIME');
    }

    public function test_ticket_triage_returns_three_categories_and_department(): void
    {
        $this->postJson('/api/triage', ['message' => 'My parcel has not arrived and tracking has not updated'])
            ->assertOk()
            ->assertJsonCount(3, 'predictions')
            ->assertJsonStructure(['predictions' => [0 => ['category', 'confidence']], 'department', 'response_improvement']);
    }

    public function test_forecast_supports_horizons_and_a_seeded_history(): void
    {
        $this->getJson('/api/forecast?hub=Eastgate&days=7&promotion=true')
            ->assertOk()
            ->assertJsonPath('hub', 'Eastgate')
            ->assertJsonCount(7, 'forecast')
            ->assertJsonCount(45, 'history')
            ->assertJsonStructure(['peak', 'couriers']);
    }

    public function test_forecast_scenario_toggles_shift_volume_upward(): void
    {
        $baseline = $this->getJson('/api/forecast?hub=Northline&days=7')->assertOk()->json('forecast.0.value');
        $promotion = $this->getJson('/api/forecast?hub=Northline&days=7&promotion=true')->assertOk()->json('forecast.0.value');
        $weather = $this->getJson('/api/forecast?hub=Northline&days=7&weather=true')->assertOk()->json('forecast.0.value');

        $this->assertGreaterThan($baseline, $promotion);
        $this->assertGreaterThan($baseline, $weather);
    }

    public function test_analytics_reports_holdout_metrics_and_confusion_matrices(): void
    {
        $this->getJson('/api/analytics')
            ->assertOk()
            ->assertJsonStructure([
                'regression' => ['mae', 'r2'],
                'svm' => ['labels', 'matrix'],
                'bayes' => ['labels', 'matrix'],
                'tree' => ['features'],
                'neural' => ['mae', 'points'],
                'dataset' => ['shipments', 'tickets', 'hub_days'],
            ]);
    }

    public function test_seeded_datasets_are_downloadable_as_csv(): void
    {
        $this->get('/api/dataset.csv?type=volumes')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }
}
