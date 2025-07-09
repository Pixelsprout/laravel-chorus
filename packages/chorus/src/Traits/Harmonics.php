<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Traits;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Pixelsprout\LaravelChorus\Adapters\EloquentHarmonicSourceAdapter;
use Pixelsprout\LaravelChorus\Events\HarmonicCreated;
use Pixelsprout\LaravelChorus\Listeners\TrackChannelConnections;
use Pixelsprout\LaravelChorus\Models\Harmonic;
use Pixelsprout\LaravelChorus\Adapters\HarmonicSourceAdapterManager;

trait Harmonics
{
    use HasUuids;

    /**
     * Boot the trait and register model event listeners through the adapter manager
     */
    public static function bootHarmonics(): void
    {
        $manager = app(HarmonicSourceAdapterManager::class);
        $manager->startTracking(static::class);
    }

    /**
     * Get the fields that should be synced
     *
     * Override this method in your model to define which fields should be synced
     * For example:
     * public function getSyncFields(): array
     * {
     *     return ['name', 'email'];
     * }
     *
     * The primary key is always included automatically
     */
    public function getSyncFields(): array
    {
        // Start with base fields
        $syncFields = [];

        // Check if the model has a syncFields property
        if (
            property_exists($this, "syncFields") &&
            is_array($this->syncFields)
        ) {
            $syncFields = $this->syncFields;
        }
        // If model has a syncFields() method, use that
        elseif (method_exists($this, "syncFields")) {
            $syncFields = $this->syncFields();
        }

        // Always include the primary key
        $primaryKey = $this->getKeyName();
        if (!in_array($primaryKey, $syncFields)) {
            array_unshift($syncFields, $primaryKey);
        }

        return $syncFields;
    }

    /**
-     * Get a query that filters which records should be synced to the client
-     *
-     * Override this method in your model to define a query filter for syncing
-     * For example:
     */
    public function getSyncFilter()
    {
        // Check if the model has a syncFilter() method, use that
        if (method_exists($this, "syncFilter")) {
            return $this->syncFilter();
        }

        // Default to no filter (sync all records)
        return null;
    }
}
