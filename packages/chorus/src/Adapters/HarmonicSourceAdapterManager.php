<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Adapters;

use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

final class HarmonicSourceAdapterManager
{
    /**
     * Available adapters registry
     */
    private array $adapters = [];

    /**
     * Active adapter instance
     */
    private ?HarmonicSourceAdapterInterface $activeAdapter = null;

    /**
     * Models currently being tracked
     */
    private array $trackedModels = [];

    public function __construct()
    {
        $this->registerDefaultAdapters();
    }

    /**
     * Register a new adapter
     */
    public function registerAdapter(string $name, string $adapterClass): void
    {
        if (! class_exists($adapterClass)) {
            throw new InvalidArgumentException(
                "Adapter class {$adapterClass} does not exist"
            );
        }

        if (
            ! is_subclass_of(
                $adapterClass,
                HarmonicSourceAdapterInterface::class
            )
        ) {
            throw new InvalidArgumentException(
                "Adapter class {$adapterClass} must implement HarmonicSourceAdapterInterface"
            );
        }

        $this->adapters[$name] = $adapterClass;
    }

    /**
     * Get the active adapter instance
     */
    public function getActiveAdapter(): HarmonicSourceAdapterInterface
    {
        if ($this->activeAdapter === null) {
            $this->activeAdapter = $this->createAdapter();
        }

        return $this->activeAdapter;
    }

    /**
     * Start tracking a model
     *
     * @param  Model  $model
     */
    public function startTracking(string $modelClass): void
    {
        $adapter = $this->getActiveAdapter();

        $adapter->initialize($modelClass);

        $adapter->startTracking($modelClass);
    }

    /**
     * Stop tracking a model
     */
    public function stopTracking(string $modelName): void
    {
        $adapter = $this->getActiveAdapter();
        $adapter->stopTracking($modelName);

        unset($this->trackedModels[$modelName]);
    }

    /**
     * Check if a model is being tracked
     */
    public function isTracking(string $modelName): bool
    {
        $adapter = $this->getActiveAdapter();

        return $adapter->isTracking($modelName);
    }

    /**
     * Get the name of the active adapter
     */
    public function getActiveAdapterName(): string
    {
        return $this->getActiveAdapter()->getName();
    }

    /**
     * Get all available adapter names
     */
    public function getAvailableAdapters(): array
    {
        return array_keys($this->adapters);
    }

    /**
     * Get all models currently being tracked
     */
    public function getTrackedModels(): array
    {
        return $this->trackedModels;
    }

    /**
     * Register default adapters
     */
    private function registerDefaultAdapters(): void
    {
        $this->registerAdapter(
            'eloquent',
            EloquentHarmonicSourceAdapter::class
        );
    }

    /**
     * Create adapter instance based on configuration
     */
    private function createAdapter(): HarmonicSourceAdapterInterface
    {
        $adapterName = config('chorus.harmonic_source_adapter', 'eloquent');

        if (! isset($this->adapters[$adapterName])) {
            throw new InvalidArgumentException(
                "Unknown harmonic source adapter: {$adapterName}"
            );
        }

        $adapterClass = $this->adapters[$adapterName];

        return new $adapterClass();
    }
}
