<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Redis Connection
    |--------------------------------------------------------------------------
    |
    | This value determines the Redis connection that will be used by Chorus.
    | By default, the default connection will be used.
    |
    */
    'redis_connection' => env('CHORUS_REDIS_CONNECTION', 'default'),

    /*
    |--------------------------------------------------------------------------
    | Harmonics Table
    |--------------------------------------------------------------------------
    |
    | This value determines the name of the table that will be used to store
    | harmonics data for persistence. You may change this to any name you wish.
    |
    */
    'harmonics_table' => env('CHORUS_HARMONICS_TABLE', 'harmonics'),

    /*
    |--------------------------------------------------------------------------
    | Redis Prefix
    |--------------------------------------------------------------------------
    |
    | This value determines the prefix that will be used for Redis keys.
    | You may change this to prevent collisions with other applications.
    |
    */
    'redis_prefix' => env('CHORUS_REDIS_PREFIX', 'chorus:'),

    /*
    |--------------------------------------------------------------------------
    | Redis Channel
    |--------------------------------------------------------------------------
    |
    | This value determines the Redis channel that will be used for publishing
    | harmonics events.
    |
    */
    'redis_channel' => env('CHORUS_REDIS_CHANNEL', 'chorus.harmonics'),

    /*
    |--------------------------------------------------------------------------
    | Models with Harmonics Trait
    |--------------------------------------------------------------------------
    |
    | This array maps table names to their corresponding model classes that use
    | the Harmonics trait. The SyncController uses this to validate requests
    | and determine which models to sync.
    |
    | Example: 'users' => \App\Models\User::class
    |
    */
    'models' => [],
    
    /*
    |--------------------------------------------------------------------------
    | Route Configuration
    |--------------------------------------------------------------------------
    |
    | Configure how Chorus routes are registered with your application.
    | By default, routes are registered under the 'api' prefix, with
    | a configurable set of middleware.
    |
    */
    'routes' => [
        'prefix' => 'api',
        'middleware' => ['api'],
    ],
];