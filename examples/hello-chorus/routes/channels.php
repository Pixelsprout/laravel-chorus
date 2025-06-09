<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Chorus channels
Broadcast::channel('chorus.table.{table}', function () {
    return true;
});
