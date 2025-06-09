<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Pixelsprout\LaravelChorus\Console\Commands\ChorusStart;
use Pixelsprout\LaravelChorus\Console\Commands\ChorusInstall;

final class ChorusServiceProvider extends ServiceProvider {
  public function boot(): void {
    // Register API routes with configuration from config/chorus.php
    $this->app->booted(function () {
      $routeConfig = config('chorus.routes', ['prefix' => 'api', 'middleware' => ['api']]);
      
      Route::prefix($routeConfig['prefix'])
          ->middleware($routeConfig['middleware'])
          ->group(__DIR__ . '/../Routes/api.php');
    });

    // Register commands
    if ($this->app->runningInConsole()) {
      $this->commands([
        ChorusStart::class,
        ChorusInstall::class,
      ]);

      // Publish migrations
      $this->publishes([
        __DIR__ . '/../Database/Migrations' => database_path('migrations'),
      ], 'chorus-migrations');

      // Publish config
      $this->publishes([
        __DIR__ . '/../Config/chorus.php' => config_path('chorus.php'),
      ], 'chorus-config');

      // Publish JavaScript resources
      $this->publishes([
        __DIR__ . '/../../resources/js' => resource_path('js/chorus'),
      ], 'chorus-js');
    }
  }

  public function register(): void {
    // Register services if needed
    $this->mergeConfigFrom(
      __DIR__ . '/../Config/chorus.php',
      'chorus'
    );
  }
}
