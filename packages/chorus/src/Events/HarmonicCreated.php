<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class HarmonicCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Model $model;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public array $harmonic,
        Model $model,
        public array $channels = []
    ) {
        $this->model = $model;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'harmonic.created';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return $this->harmonic;
    }

    public function broadcastOn(): array
    {
        return $this->channels;
    }
}
