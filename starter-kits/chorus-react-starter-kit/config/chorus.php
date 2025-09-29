<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Harmonic Source Adapter
    |--------------------------------------------------------------------------
    |
    | This option allows you to specify the adapter that will be used to
    | source harmonic changes. By default, Chorus will use the Eloquent
    | adapter which will track changes to your Eloquent models.
    |
    */

    'harmonic_source_adapter' => 'eloquent',

    /*
    |--------------------------------------------------------------------------
    | Model Namespace
    |--------------------------------------------------------------------------
    |
    | This value is the namespace that will be used when looking up your
    | application's models. This namespace will be used when generating
    | harmonics for your models.
    |
    */

    'model_namespace' => 'App\\Models',

    /*
    |--------------------------------------------------------------------------
    | Database Connection
    |--------------------------------------------------------------------------
    |
    | This is the database connection that will be used to store harmonics.
    | It should be the same connection that is used by your models that
    | are using the Harmonics trait.
    |
    */

    'database_connection' => env('CHORUS_DB_CONNECTION', config('database.default')),

    /*
    |--------------------------------------------------------------------------
    | Broadcasting
    |--------------------------------------------------------------------------
    |
    | This is the broadcasting configuration for Chorus. The channel prefix
    | will be used to prefix all Chorus channels. The authentication guard
    | will be used to authenticate users when they connect to Chorus channels.
    |
    */

    'broadcasting' => [
        'channel_prefix' => 'chorus',
        'auth_guard' => 'web',
    ],

];