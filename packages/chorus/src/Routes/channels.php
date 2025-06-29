<?php

use Illuminate\Support\Facades\Broadcast;

// Chorus channels
Broadcast::channel("chorus.user.{id}", function ($user, $id) {
    return (int) $user->id === (int) $id;
});
