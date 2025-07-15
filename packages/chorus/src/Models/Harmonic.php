<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Harmonic extends Model {

  use HasUuids;

  protected $fillable = [
    'id',
    'table_name',
    'record_id',
    'operation',
    'data',
    'user_id',
    'processed_at',
  ];

  protected $casts = [
    'data' => 'array',
    'processed_at' => 'datetime',
  ];

  /**
   * Get harmonics for a specific model
   */
  public static function forModel(string $tableName, $recordId): array {
    return static::query()
      ->where('table_name', $tableName)
      ->where('record_id', $recordId)
      ->orderBy('id', 'asc')
      ->get()
      ->toArray();
  }

  /**
   * Get all unprocessed harmonics
   */
  public static function unprocessed(int $limit = 100): array {
    return static::query()
      ->whereNull('processed_at')
      ->orderBy('id', 'asc')
      ->limit($limit)
      ->get()
      ->toArray();
  }

  /**
   * Get the decoded data
   */
  public function getDecodedDataAttribute(): array {
    return json_decode($this->data, true) ?? [];
  }
}

