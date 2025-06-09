<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Traits;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use \Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Pixelsprout\LaravelChorus\Events\HarmonicCreated;
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

    HarmonicCreated::dispatch($harmonicData);

    Harmonic::create($harmonicData);
  }
}
