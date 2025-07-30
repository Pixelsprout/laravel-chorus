<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Adapters;

use Illuminate\Database\Eloquent\Model;

interface HarmonicSourceAdapterInterface
{
    /**
     * Initialize the adapter for the given model.
     */
    public function initialize(string $modelClass): void;

    /**
     * Start tracking changes for the model.
     */
    public function startTracking(string $modelClass): void;

    /**
     * Stop tracking changes for the model.
     */
    public function stopTracking(string $modelClass): void;

    /**
     * Check if the adapter is actively tracking the model.
     */
    public function isTracking(string $modelClass): bool;

    /**
     * Get the name of this adapter.
     */
    public function getName(): string;

    /**
     * Record a harmonic event for the given model.
     */
    public function recordHarmonic(Model $model, string $operation): void;

    /**
     * Get the fields that should be synced for the given model.
     */
    public function getSyncFields(Model $model): array;

    /**
     * Dispatch harmonic event to all active channels.
     */
    public function dispatchToActiveChannels(
        Model $model,
        array $harmonicData
    ): void;
}
