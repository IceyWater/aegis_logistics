<?php

namespace App\Providers;

use App\Services\LogisticsModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(LogisticsModels::class, fn () => Cache::store('file')->remember('aegis.models.v5', now()->endOfDay(), fn () => new LogisticsModels()));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
