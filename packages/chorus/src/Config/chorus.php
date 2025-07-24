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
    | Database Version Tracking
    |--------------------------------------------------------------------------
    |
    | Enable automatic database version tracking based on migration state.
    | When enabled, clients will automatically rebuild their local database
    | when migrations are run (e.g., migrate:fresh, new migrations, rollbacks).
    |
    */
    "track_database_version" => env("CHORUS_TRACK_DATABASE_VERSION", true),
];
