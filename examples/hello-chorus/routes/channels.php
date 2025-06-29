<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return $user->id === $id;
});

// Chorus channels
Broadcast::channel('chorus.user.{id}', function ($user, $id) {
    return $user->id === $id;
});
