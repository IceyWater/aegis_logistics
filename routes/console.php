<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use App\Services\LogisticsModels;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('aegis:models:train {--export : Write the generated CSV datasets to private storage}', function () {
    $models = app(LogisticsModels::class);
    $analytics = $models->analytics();
    $this->info('Aegis synthetic dataset and six model pipelines are ready.');
    $this->line('Shipments: ' . $analytics['dataset']['shipments']);
    $this->line('Support tickets: ' . $analytics['dataset']['tickets']);
    $this->line('Hub-day records: ' . $analytics['dataset']['hub_days']);
    $this->line('Regression holdout MAE: $' . $analytics['regression']['mae'] . ' · R² ' . $analytics['regression']['r2']);
    $this->line('Forecast holdout MAE: ' . $analytics['neural']['mae'] . ' parcels/day');

    if ($this->option('export')) {
        $datasets = [
            'shipments.csv' => $models->exportShipments(),
            'tickets.csv' => $models->exportTickets(),
            'volumes.csv' => $models->exportVolumes(),
        ];
        foreach ($datasets as $filename => $rows) {
            $handle = fopen('php://temp', 'r+');
            fputcsv($handle, array_keys($rows[0]));
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            rewind($handle);
            $csv = stream_get_contents($handle);
            fclose($handle);

            if (! Storage::disk('local')->put('aegis-demo-data/' . $filename, $csv)) {
                throw new RuntimeException("Unable to export {$filename}.");
            }
        }
        $this->info('CSV exports saved in storage/app/private/aegis-demo-data.');
    }
})->purpose('Train and inspect the seeded logistics models');
