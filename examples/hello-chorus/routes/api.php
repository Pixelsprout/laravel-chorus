<?php

use App\Actions\ChorusActions\CreateMessageWithActivityAction;
use App\Actions\ChorusActions\UpdateMessageAction;
use App\Actions\ChorusActions\DeleteMessageAction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::get('/user', function (Request $request) {
    return $request->user();
});

// Chorus Actions - Explicit Route Binding
Route::middleware(['auth'])->group(function () {
    Route::post('/actions/create-message-with-activity', CreateMessageWithActivityAction::class)
        ->name('chorus.actions.create-message-with-activity');
    
    Route::post('/actions/update-message', UpdateMessageAction::class)
        ->name('chorus.actions.update-message');
    
    Route::post('/actions/delete-message', DeleteMessageAction::class)
        ->name('chorus.actions.delete-message');
});
