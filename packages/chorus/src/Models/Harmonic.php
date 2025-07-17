<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Pixelsprout\LaravelChorus\Events\HarmonicCreated;
use Pixelsprout\LaravelChorus\Listeners\TrackChannelConnections;

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
    'rejected',
    'rejected_reason',
  ];

  protected $casts = [
    'data' => 'array',
    'processed_at' => 'datetime',
    'rejected' => 'boolean',
  ];

  /**
   * Boot the model and set up event listeners
   */
  protected static function boot()
  {
    parent::boot();

    // Listen for created events to broadcast rejected harmonics
    static::created(function ($harmonic) {
      // Only broadcast if this is a rejected harmonic
      if ($harmonic->rejected) {
        $harmonic->broadcastRejectedHarmonic();
      }
    });
  }

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

  /**
   * Create a rejected harmonic for validation failures
   */
  public static function createRejected(
    string $operation,
    array $data,
    string $rejectedReason,
    ?string $userId = null,
    ?string $id = null
  ): static {
    return static::create([
      'id' => $id ?? Str::uuid(),
      'table_name' => null,
      'record_id' => null,
      'operation' => $operation,
      'data' => $data,
      'user_id' => $userId,
      'rejected' => true,
      'rejected_reason' => $rejectedReason,
    ]);
  }

  /**
   * Create a rejected harmonic for permission failures
   */
  public static function createPermissionRejected(
    string $operation,
    array $data,
    ?string $userId = null,
    ?string $id = null
  ): static {
    return static::createRejected($operation, $data, 'Permission denied', $userId, $id);
  }

  /**
   * Create a rejected harmonic for validation failures
   */
  public static function createValidationRejected(
    string $operation,
    array $data,
    string $validationErrors,
    ?string $userId = null,
    ?string $id = null
  ): static {
    return static::createRejected($operation, $data, "Validation failed: {$validationErrors}", $userId, $id);
  }

  /**
   * Check if this harmonic is rejected
   */
  public function isRejected(): bool {
    return $this->rejected === true;
  }

  /**
   * Get rejected harmonics for a user
   */
  public static function rejectedForUser(?string $userId, int $limit = 100): array {
    return static::query()
      ->where('rejected', true)
      ->where('user_id', $userId)
      ->orderBy('id', 'desc')
      ->limit($limit)
      ->get()
      ->toArray();
  }

  /**
   * Broadcast a rejected harmonic to the appropriate channels
   */
  protected function broadcastRejectedHarmonic(): void
  {
    if (!$this->user_id) {
      return; // Can't broadcast without a user ID
    }

    // Get active channels for this user
    $channelTracker = app(TrackChannelConnections::class);
    $activeChannels = $channelTracker->getActiveChannels();
    
    // Find channels that match this user
    $userChannels = [];
    $userId = (string) $this->user_id;
    
    foreach ($activeChannels as $channelName => $timestamp) {
      if (str_ends_with($channelName, ".user.{$userId}")) {
        // Remove "private-" prefix if it exists since PrivateChannel will add it
        $cleanChannelName = str_starts_with($channelName, 'private-') 
          ? substr($channelName, 8) 
          : $channelName;
        $userChannels[] = new PrivateChannel($cleanChannelName);
      }
    }

    // Early return if no user channels.
    if(empty($userChannels)) {
        Log::error('Failed to broadcast rejected harmonic channels for userId: ' . $userId);
        return;
    }

    // Broadcast the rejected harmonic
      $harmonicData = [
        'id' => $this->id,
        'table_name' => $this->table_name,
        'record_id' => $this->record_id,
        'operation' => $this->operation,
        'data' => $this->data,
        'user_id' => $this->user_id,
        'rejected' => $this->rejected,
        'rejected_reason' => $this->rejected_reason,
        'created_at' => $this->created_at?->toISOString(),
        'updated_at' => $this->updated_at?->toISOString(),
      ];

      Log::info("Broadcasting rejected harmonic to channels: " . implode(', ', array_map(fn($ch) => $ch->name, $userChannels)));
      HarmonicCreated::dispatch($harmonicData, $this, $userChannels);
  }
}

