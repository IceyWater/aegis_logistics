<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LogisticsModels;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LogisticsController extends Controller
{
    public function health(): JsonResponse
    {
        return response()->json(['status' => 'ready', 'models' => 6, 'dataset' => 'seeded synthetic logistics data']);
    }

    public function models(LogisticsModels $models): JsonResponse
    {
        return response()->json(['models' => $models->models()]);
    }

    public function quote(Request $request, LogisticsModels $models): JsonResponse
    {
        $input = $request->validate([
            'distance_km' => ['required', 'numeric', 'between:1,500'],
            'weight_kg' => ['required', 'numeric', 'between:0.1,50'],
            'stops' => ['required', 'integer', 'between:1,12'],
            'model' => ['sometimes', 'in:regression,knn'],
        ]);
        return response()->json($models->quote((float) $input['distance_km'], (float) $input['weight_kg'], (int) $input['stops'], $input['model'] ?? 'regression'));
    }

    public function risk(Request $request, LogisticsModels $models): JsonResponse
    {
        $input = $request->validate([
            'weather' => ['required', 'in:clear,rain,storm'],
            'hub_load' => ['required', 'in:low,medium,high'],
            'distance_km' => ['required', 'numeric', 'between:1,500'],
        ]);
        return response()->json($models->risk($input['weather'], $input['hub_load'], (float) $input['distance_km']));
    }

    public function triage(Request $request, LogisticsModels $models): JsonResponse
    {
        $input = $request->validate(['message' => ['required', 'string', 'min:5', 'max:2000']]);
        return response()->json($models->triage($input['message']));
    }

    public function forecast(Request $request, LogisticsModels $models): JsonResponse
    {
        $input = $request->validate([
            'hub' => ['sometimes', 'in:Northline,Riverside,Eastgate'],
            'days' => ['sometimes', 'integer', 'in:7,14,30'],
            'promotion' => ['sometimes', 'in:true,false,1,0'],
            'weather' => ['sometimes', 'in:true,false,1,0'],
        ]);
        return response()->json($models->forecast($input['hub'] ?? 'Northline', (int) ($input['days'] ?? 14), $request->boolean('promotion'), $request->boolean('weather')));
    }

    public function analytics(LogisticsModels $models): JsonResponse
    {
        return response()->json($models->analytics());
    }

    public function network(LogisticsModels $models): JsonResponse
    {
        return response()->json($models->network());
    }

    public function dataset(Request $request, LogisticsModels $models): StreamedResponse
    {
        $type = $request->query('type', 'shipments');
        abort_unless(in_array($type, ['shipments', 'tickets', 'volumes'], true), 404);
        $rows = match ($type) {
            'shipments' => $models->exportShipments(),
            'tickets' => $models->exportTickets(),
            'volumes' => $models->exportVolumes(),
        };

        return response()->streamDownload(function () use ($rows) {
            $output = fopen('php://output', 'w');
            fputcsv($output, array_keys($rows[0]));
            foreach ($rows as $row) {
                fputcsv($output, $row);
            }
            fclose($output);
        }, "aegis-{$type}.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
