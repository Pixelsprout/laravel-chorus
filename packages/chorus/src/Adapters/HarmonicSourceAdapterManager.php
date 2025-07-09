<?php

namespace Pixelsprout\LaravelChorus\Adapters;

use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

class HarmonicSourceAdapterManager
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
     * Register default adapters
     */
    private function registerDefaultAdapters(): void
    {
        $this->registerAdapter(
            "eloquent",
            EloquentHarmonicSourceAdapter::class
        );
    }

    /**
     * Register a new adapter
     *
     * @param string $name
     * @param string $adapterClass
     * @return void
     */
    public function registerAdapter(string $name, string $adapterClass): void
    {
        if (!class_exists($adapterClass)) {
            throw new InvalidArgumentException(
                "Adapter class {$adapterClass} does not exist"
            );
        }

        if (
            !is_subclass_of(
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
     *
     * @return HarmonicSourceAdapterInterface
     */
    public function getActiveAdapter(): HarmonicSourceAdapterInterface
    {
        if ($this->activeAdapter === null) {
            $this->activeAdapter = $this->createAdapter();
        }

        return $this->activeAdapter;
    }

    /**
     * Create adapter instance based on configuration
     *
     * @return HarmonicSourceAdapterInterface
     */
    private function createAdapter(): HarmonicSourceAdapterInterface
    {
        $adapterName = config("chorus.harmonic_source_adapter", "eloquent");

        if (!isset($this->adapters[$adapterName])) {
            throw new InvalidArgumentException(
                "Unknown harmonic source adapter: {$adapterName}"
            );
        }

        $adapterClass = $this->adapters[$adapterName];
        return new $adapterClass();
    }

    /**
     * Start tracking a model
     *
     * @param Model $model
     * @return void
     */
    public function startTracking(string $modelClass): void
    {
        $adapter = $this->getActiveAdapter();

        $adapter->initialize($modelClass);

        $adapter->startTracking($modelClass);
    }

    /**
     * Stop tracking a model
     *
     * @param Model $model
     * @return void
     */
    public function stopTracking(Model $model): void
    {
        $adapter = $this->getActiveAdapter();
        $adapter->stopTracking($model);

        unset($this->trackedModels[get_class($model)]);
    }

    /**
     * Check if a model is being tracked
     *
     * @param Model $model
     * @return bool
     */
    public function isTracking(Model $model): bool
    {
        $adapter = $this->getActiveAdapter();
        return $adapter->isTracking($model);
    }

    /**
     * Get the name of the active adapter
     *
     * @return string
     */
    public function getActiveAdapterName(): string
    {
        return $this->getActiveAdapter()->getName();
    }

    /**
     * Get all available adapter names
     *
     * @return array
     */
    public function getAvailableAdapters(): array
    {
        return array_keys($this->adapters);
    }

    /**
     * Get all models currently being tracked
     *
     * @return array
     */
    public function getTrackedModels(): array
    {
        return $this->trackedModels;
    }
}
