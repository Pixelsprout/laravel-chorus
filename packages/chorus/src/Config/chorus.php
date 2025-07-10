<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Harmonics Table
    |--------------------------------------------------------------------------
    |
    | This value determines the name of the table that will be used to store
    | harmonics data for persistence. You may change this to any name you wish.
    |
    */
    "harmonics_table" => env("CHORUS_HARMONICS_TABLE", "harmonics"),

    /*
    |--------------------------------------------------------------------------
    | Harmonic Channel Prefix
    |--------------------------------------------------------------------------
    |
    | This value determines the prefix for the WebSocket channels. It can be
    | a static string or a class that implements the PrefixResolver interface.
    | If a class is provided, it will be resolved to dynamically generate the prefix.
    |
    */
    "harmonic_channel_prefix" => "",

    /*
    |--------------------------------------------------------------------------
    | Harmonic Source Adapter
    |--------------------------------------------------------------------------
    |
    | This value determines which adapter will be used to track changes to your
    | models. Available adapters: 'eloquent' (default).
    |
    | The 'eloquent' adapter uses Laravel's built-in model events to track
    | changes to your models and record them in the harmonics table.
    |
    */
    "harmonic_source_adapter" => env(
        "CHORUS_HARMONIC_SOURCE_ADAPTER",
        "eloquent"
    ),

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
    "models" => [],

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
    "routes" => [
        "prefix" => "api",
        "middleware" => ["web", "api"],
    ],

    /*
    |--------------------------------------------------------------------------
    | Frontend Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration options for the JavaScript client. These settings are used
    | by the frontend adapters to customize the behavior of the client.
    |
    */
    "frontend" => [
        "db_name" => env("CHORUS_DB_NAME", "chorus-db"),
        "storage_prefix" => env("CHORUS_STORAGE_PREFIX", "chorus_"),
        "broadcast_channel_format" => env(
            "CHORUS_BROADCAST_FORMAT",
            "chorus.table.{table}"
        ),
        "echo_event_name" => env("CHORUS_ECHO_EVENT", "harmonic.created"),
    ],

    /*
    |--------------------------------------------------------------------------
    | Pagination Limits
    |--------------------------------------------------------------------------
    |
    | Configure the maximum number of records to return in a single sync request.
    |
    */
    "pagination" => [
        "initial_sync_limit" => env("CHORUS_INITIAL_SYNC_LIMIT", 1000),
        "incremental_sync_limit" => env("CHORUS_INCREMENTAL_SYNC_LIMIT", 500),
    ],
];
