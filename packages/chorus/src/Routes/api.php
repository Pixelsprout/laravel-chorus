<?php

use Illuminate\Support\Facades\Route;
use Pixelsprout\LaravelChorus\Http\Controllers\SyncController;
use Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController;

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

// Write Actions API
Route::middleware(['auth'])->group(function () {
    Route::get("actions/{table}", [ChorusWriteController::class, "getActions"]);
    Route::post("write/{table}/{action}", [ChorusWriteController::class, "handleAction"]);
});
