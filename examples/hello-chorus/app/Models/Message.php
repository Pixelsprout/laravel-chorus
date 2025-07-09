<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Pixelsprout\LaravelChorus\Traits\Harmonics;

class Message extends Model {
    use Harmonics;

    protected $guarded = [];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Fields to sync to the client
     */
    protected $syncFields = [
        'id',
        'body',
        'user_id',
        'platform_id',
        'created_at',
        'updated_at',
    ];

    /**
     * Filter messages to only sync those belonging to the current user
     */
    protected function syncFilter(): Builder {
        $user = auth()->user();

        if (! $user) {
            return static::query()->whereRaw('1 = 0'); // No user, no messages
        }

        $allowedPlatformIds = $user->platforms->pluck('id');

        return static::query()->whereIn('platform_id', $allowedPlatformIds);
    }

    public function user(): BelongsTo {
        return $this->belongsTo(User::class);
    }

    public function platform(): BelongsTo {
        return $this->belongsTo(Platform::class);
    }
}
