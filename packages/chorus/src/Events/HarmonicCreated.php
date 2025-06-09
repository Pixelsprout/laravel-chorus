<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class HarmonicCreated implements ShouldBroadcastNow {
  use Dispatchable, InteractsWithSockets, SerializesModels;

  /**
   * Create a new event instance.
   */
  public function __construct(public array $harmonic) {
  }

  /**
   * The event's broadcast name.
   */
  public function broadcastAs(): string {
    return 'harmonic.created';
  }

  /**
   * Get the data to broadcast.
   */
  public function broadcastWith(): array {
    return $this->harmonic;
  }

  public function broadcastOn(): Channel {
    return new PrivateChannel('chorus.table.' . $this->harmonic['table_name']);
  }
}

