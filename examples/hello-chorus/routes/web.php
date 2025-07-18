<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        $tenantName = auth()->user()->tenant->name;
        return Inertia::render('dashboard', [
            'tenantName' => $tenantName
        ]);
    })->name('dashboard');

    // Actions
    Route::post('messages', '\\App\\Actions\\CreateMessage')->name('messages.create');
    Route::put('messages/{messageId}', '\\App\\Actions\\UpdateMessage')->name('messages.update');
    Route::delete('messages/{messageId}', '\\App\\Actions\\DeleteMessage')->name('messages.destroy');
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
