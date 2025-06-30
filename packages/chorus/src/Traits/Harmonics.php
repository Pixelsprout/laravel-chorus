<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Traits;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use \Illuminate\Support\Str;
use Pixelsprout\LaravelChorus\Events\HarmonicCreated;
use Pixelsprout\LaravelChorus\Listeners\TrackChannelConnections;
use Pixelsprout\LaravelChorus\Models\Harmonic;

trait Harmonics {

  use HasUuids;

  /**
   * Boot the trait and register model event listeners
   */
  public static function bootHarmonics(): void {
    static::created(function (Model $model) {
      $model->recordHarmonic('create');
    });

    static::updated(function (Model $model) {
      $model->recordHarmonic('update');
    });

    static::deleted(function (Model $model) {
      $model->recordHarmonic('delete');
    });
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
  public function getSyncFields(): array {
    // Start with base fields
    $syncFields = [];

    // Check if the model has a syncFields property
    if (property_exists($this, 'syncFields') && is_array($this->syncFields)) {
      $syncFields = $this->syncFields;
    }
    // If model has a syncFields() method, use that
    elseif (method_exists($this, 'syncFields')) {
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
   * Get a query that filters which records should be synced to the client
   * 
   * Override this method in your model to define a query filter for syncing
   * For example:
   * public function getSyncFilter()
   * {
   *     return $this->where('user_id', auth()->id());
   * }
   * 
   * Return null to sync all records (default behavior)
   */
  public function getSyncFilter() {
    // Check if the model has a syncFilter() method, use that
    if (method_exists($this, 'syncFilter')) {
      return $this->syncFilter();
    }
    
    // Default to no filter (sync all records)
    return null;
  }

  /**
   * Record a harmonic event for this model
   */
  protected function recordHarmonic(string $operation): void {
    $tableName = $this->getTable();
    $recordId = $this->getKey();

    // Filter the data to only include sync fields
    $data = [];
    $syncFields = $this->getSyncFields();

    // Only sync fields that are explicitly defined including whatever is the primary key
    foreach ($syncFields as $field) {
      if (array_key_exists($field, $this->getAttributes())) {
        $data[$field] = $this->getAttribute($field);
      }
    }

    // Create harmonic payload:with
    $harmonicData = [
      'id' => Str::uuid7(),
      'table_name' => $tableName,
      'record_id' => $recordId,
      'operation' => $operation,
      'data' => json_encode($data),
      'user_id' => auth()->id() ?? null, // Optional, for scoped sync
      'created_at' => now()->toDateTimeString(),
    ];

    // Dispatch to all active channels
    $this->dispatchToActiveChannels($harmonicData);

    Harmonic::create($harmonicData);
  }

  /**
   * Dispatch harmonic event to all active channels
   */
  protected function dispatchToActiveChannels(array $harmonicData): void {
    // Get all active user IDs from the channel tracker
    $activeUserIds = TrackChannelConnections::getActiveUserIds();

    // Create channels for all active users
    $channels = [];
    foreach ($activeUserIds as $userId) {
      $channels[] = new PrivateChannel("chorus.user." . $userId);
    }

    // Only dispatch if there are active channels
    if (!empty($channels)) {
      HarmonicCreated::dispatch($harmonicData, $channels);
    }
  }
}
