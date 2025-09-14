<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Actions\ChorusActions\CreateUserAction;

Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

// Chorus Actions - must be authenticated
Route::middleware(['auth'])->group(function () {
    Route::post('/api/actions/create-user', CreateUserAction::class)->name('chorus.create-user');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
