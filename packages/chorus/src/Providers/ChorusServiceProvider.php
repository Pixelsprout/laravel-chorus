<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Providers;

use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Laravel\Reverb\Events\ChannelCreated;
use Laravel\Reverb\Events\ChannelRemoved;
use Pixelsprout\LaravelChorus\Console\Commands\ChorusStart;
use Pixelsprout\LaravelChorus\Console\Commands\ChorusInstall;
use Pixelsprout\LaravelChorus\Console\Commands\ChorusGenerate;
use Pixelsprout\LaravelChorus\Console\Commands\ChorusDebug;
use Pixelsprout\LaravelChorus\Console\Commands\MakeWriteActionCommand;
use Pixelsprout\LaravelChorus\Listeners\TrackChannelConnections;
use Pixelsprout\LaravelChorus\Adapters\HarmonicSourceAdapterManager;
use Pixelsprout\LaravelChorus\Support\WriteActionRegistry;

final class ChorusServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Register Reverb channel tracking events
        Event::listen(ChannelCreated::class, [
            TrackChannelConnections::class,
            "handleChannelCreated",
        ]);
        Event::listen(ChannelRemoved::class, [
            TrackChannelConnections::class,
            "handleChannelRemoved",
        ]);

        // Register API routes with configuration from config/chorus.php
        $this->app->booted(function () {
            $routeConfig = config("chorus.routes", [
                "prefix" => "api",
                "middleware" => ["web"],
            ]);

            Route::prefix($routeConfig["prefix"])
                ->middleware($routeConfig["middleware"])
                ->group(__DIR__ . "/../Routes/api.php");

            // Register write action routes dynamically
            Route::prefix($routeConfig["prefix"])
                ->middleware($routeConfig["middleware"])
                ->group(function () {
                    WriteActionRegistry::registerRoutes();
                });
        });

        // Register commands
        if ($this->app->runningInConsole()) {
            $this->commands([
                ChorusStart::class,
                ChorusInstall::class,
                ChorusGenerate::class,
                ChorusDebug::class,
                MakeWriteActionCommand::class,
            ]);

            // Publish migrations
            $this->publishes(
                [
                    __DIR__ . "/../Database/Migrations" => database_path(
                        "migrations"
                    ),
                ],
                "chorus-migrations"
            );

            // Publish config
            $this->publishes(
                [
                    __DIR__ . "/../Config/chorus.php" => config_path(
                        "chorus.php"
                    ),
                ],
                "chorus-config"
            );
        }
    }

    public function register(): void
    {
        // Register services if needed
        $this->mergeConfigFrom(__DIR__ . "/../Config/chorus.php", "chorus");

        // Register the HarmonicSourceAdapterManager as a singleton
        $this->app->singleton(HarmonicSourceAdapterManager::class, function (
            $app
        ) {
            return new HarmonicSourceAdapterManager();
        });
    }
}
