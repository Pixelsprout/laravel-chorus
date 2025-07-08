<?php

use Illuminate\Support\Facades\Route;
use Pixelsprout\LaravelChorus\Http\Controllers\SyncController;

/*
|--------------------------------------------------------------------------
| Chorus API Routes
|--------------------------------------------------------------------------
|
| These routes are loaded by the ChorusServiceProvider and registered
| with the 'api' middleware group.
|
*/

Route::get("sync/{table}", [SyncController::class, "getInitialData"]);
