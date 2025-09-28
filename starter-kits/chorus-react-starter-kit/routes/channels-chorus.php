<?php

use Illuminate\Support\Facades\Broadcast;

// Chorus channels
Broadcast::channel('chorus.user.{id}', function ($user, $id) {
    return (string) $user->id === (string) $id;
});

// Prefixed Chorus channels (e.g., chorus.tenantId.user.123)
//Broadcast::channel("chorus.{prefix}.user.{id}", function ($user, $prefix, $id) {
//    // Ensure the user is authenticated and their ID matches the channel ID
//    // Also, validate that the user's tenant_id matches the prefix
 //   return (string) $user->id === (string) $id && (string) $user->tenant_id === (string) $prefix;
//});