<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\LogisticsController;

Route::view('/', 'welcome');
Route::view('/quote', 'welcome');
Route::view('/risk', 'welcome');
Route::view('/triage', 'welcome');
Route::view('/forecast', 'welcome');
Route::view('/analytics', 'welcome');
Route::view('/about', 'welcome');

Route::prefix('api')->name('api.')->group(function () {
    Route::get('/health', [LogisticsController::class, 'health'])->name('health');
    Route::get('/models', [LogisticsController::class, 'models'])->name('models');
    Route::get('/analytics', [LogisticsController::class, 'analytics'])->name('analytics');
    Route::get('/network', [LogisticsController::class, 'network'])->name('network');
    Route::get('/forecast', [LogisticsController::class, 'forecast'])->name('forecast');
    Route::get('/dataset.csv', [LogisticsController::class, 'dataset'])->name('dataset');
    Route::post('/quote', [LogisticsController::class, 'quote'])->name('quote');
    Route::post('/risk', [LogisticsController::class, 'risk'])->name('risk');
    Route::post('/triage', [LogisticsController::class, 'triage'])->name('triage');
});
