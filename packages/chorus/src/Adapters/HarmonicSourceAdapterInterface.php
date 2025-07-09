<?php

namespace Pixelsprout\LaravelChorus\Adapters;

use Illuminate\Database\Eloquent\Model;

interface HarmonicSourceAdapterInterface
{
    /**
     * Initialize the adapter for the given model.
     *
     * @param string $modelClass
     * @return void
     */
    public function initialize(string $modelClass): void;

    /**
     * Start tracking changes for the model.
     *
     * @param string $modelClass
     * @return void
     */
    public function startTracking(string $modelClass): void;

    /**
     * Stop tracking changes for the model.
     *
     * @param string $modelClass
     * @return void
     */
    public function stopTracking(string $modelClass): void;

    /**
     * Check if the adapter is actively tracking the model.
     *
     * @param string $modelClass
     * @return bool
     */
    public function isTracking(string $modelClass): bool;

    /**
     * Get the name of this adapter.
     *
     * @return string
     */
    public function getName(): string;

    /**
     * Record a harmonic event for the given model.
     *
     * @param Model $model
     * @param string $operation
     * @return void
     */
    public function recordHarmonic(Model $model, string $operation): void;

    /**
     * Get the fields that should be synced for the given model.
     *
     * @param Model $model
     * @return array
     */
    public function getSyncFields(Model $model): array;

    /**
     * Dispatch harmonic event to all active channels.
     *
     * @param Model $model
     * @param array $harmonicData
     * @return void
     */
    public function dispatchToActiveChannels(
        Model $model,
        array $harmonicData
    ): void;
}
