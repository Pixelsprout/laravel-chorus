<?php

use App\Actions\CreateMessage;
use App\Http\Controllers\Api\SyncController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Validator;

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

// Message actions
Route::middleware(['web', 'auth'])->group(function () {
    Route::post('/messages', function (Request $request, CreateMessage $action) {
        $validator = Validator::make($request->all(), [
            'body' => 'required|string|max:1000',
            'platform_id' => 'required|exists:platforms,id',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        $message = $action->execute(
            $validator->validated(),
            auth()->id()
        );
        
        return response()->json([
            'message' => 'Message created successfully',
            'data' => $message
        ], 201);
    });
});

// Chorus sync routes are now provided by the package