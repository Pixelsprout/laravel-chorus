<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Adapters;

use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Pixelsprout\LaravelChorus\Events\HarmonicCreated;
use Pixelsprout\LaravelChorus\Listeners\TrackChannelConnections;
use Pixelsprout\LaravelChorus\Models\Harmonic;

final class EloquentHarmonicSourceAdapter implements HarmonicSourceAdapterInterface
{
    /**
     * Store registered event listeners for cleanup
     */
    private array $registeredListeners = [];

    /**
     * Initialize the adapter for the given model.
     */
    public function initialize(string $modelClass): void
    {
        // No specific initialization needed for Eloquent adapter

    }

    /**
     * Start tracking changes for the model.
     */
    public function startTracking(string $modelClass): void
    {
        $modelClass::created(function (Model $model) {
            $this->recordHarmonic($model, 'create');
        });

        $modelClass::updated(function (Model $model) {
            $this->recordHarmonic($model, 'update');
        });

        $modelClass::deleted(function (Model $model) {
            $this->recordHarmonic($model, 'delete');
        });
    }

    /**
     * Stop tracking changes for the model.
     *
     * @param  Model  $model
     */
    public function stopTracking(string $modelClass): void
    {
        if (isset($this->registeredListeners[$modelClass])) {
            // Laravel doesn't provide a direct way to remove specific event listeners
            // This is a limitation of the current implementation
            unset($this->registeredListeners[$modelClass]);
        }
    }

    /**
     * Check if the adapter is actively tracking the model.
     *
     * @param  Model  $model
     */
    public function isTracking(string $modelClass): bool
    {
        return isset($this->registeredListeners[$modelClass]);
    }

    /**
     * Get the name of this adapter.
     */
    public function getName(): string
    {
        return 'eloquent';
    }

    /**
     * Record a harmonic event for the given model.
     */
    public function recordHarmonic(Model $model, string $operation, ?User $user = null): void
    {
        $tableName = $model->getTable();
        $recordId = $model->getKey();

        // Filter the data to only include sync fields
        $data = [];
        $syncFields = $this->getSyncFields($model);

        // Only sync fields that are explicitly defined including whatever is the primary key
        foreach ($syncFields as $field) {
            if (array_key_exists($field, $model->getAttributes())) {
                $data[$field] = $model->getAttribute($field);
            }
        }

        // Create harmonic payload
        $harmonicData = [
            'id' => Str::uuid7(), // explicitly setting uuid so it shared with websocket payload
            'table_name' => $tableName,
            'record_id' => $recordId,
            'operation' => $operation,
            'data' => json_encode($data),
            'user_id' => $user ?? $user->id ?? null,
            'created_at' => now()->toDateTimeString(),
        ];

        // Dispatch to all active channels
        $this->dispatchToActiveChannels($model, $harmonicData);

        Harmonic::create($harmonicData);
    }

    /**
     * Get the fields that should be synced for the given model.
     */
    public function getSyncFields(Model $model): array
    {
        // Start with base fields
        $syncFields = [];

        // Check if the model has a syncFields property
        if (
            property_exists($model, 'syncFields') &&
            is_array($model->syncFields)
        ) {
            $syncFields = $model->syncFields;
        }
        // If model has a syncFields() method, use that
        elseif (method_exists($model, 'syncFields')) {
            $syncFields = $model->syncFields();
        }
        // If model has a getSyncFields() method, use that
        elseif (method_exists($model, 'getSyncFields')) {
            $syncFields = $model->getSyncFields();
        }

        // Always include the primary key
        $primaryKey = $model->getKeyName();
        if (! in_array($primaryKey, $syncFields)) {
            array_unshift($syncFields, $primaryKey);
        }

        return $syncFields;
    }

    /**
     * Dispatch harmonic event to all active channels.
     */
    public function dispatchToActiveChannels(
        Model $model,
        array $harmonicData
    ): void {
        // Get all active user IDs from the channel tracker
        $activeUserIds = TrackChannelConnections::getAuthorizedActiveUserIds(
            $model
        );

        // Create channels for all active users
        $channels = [];
        foreach ($activeUserIds as $userId) {
            $channelName = $model->getChorusChannelName($userId);
            $channels[] = new PrivateChannel($channelName);
        }

        // Only dispatch if there are active channels
        if (! empty($channels)) {
            HarmonicCreated::dispatch($harmonicData, $model, $channels);
        }
    }
}
