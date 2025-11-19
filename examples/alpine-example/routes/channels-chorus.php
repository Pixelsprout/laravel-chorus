<?php

use Illuminate\Support\Facades\Broadcast;

// Chorus channels
Broadcast::channel('chorus.user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Prefixed Chorus channels (e.g., chorus.tenantId.user.123)
//Broadcast::channel("chorus.{prefix}.user.{id}", function ($user, $prefix, $id) {
//    // Ensure the user is authenticated and their ID matches the channel ID
//    // Also, validate that the user's tenant_id matches the prefix
 //   return (int) $user->id === (int) $id && (string) $user->tenant_id === (string) $prefix;
//});
