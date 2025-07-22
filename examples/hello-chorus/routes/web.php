<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

// CSRF token refresh endpoint (no auth required for token refresh)
Route::get('/csrf-token', function () {
    return response()->json([
        'csrf_token' => csrf_token()
    ]);
})->name('csrf-token');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        $tenantName = auth()->user()->tenant->name;
        return Inertia::render('dashboard', [
            'tenantName' => $tenantName
        ]);
    })->name('dashboard');
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
