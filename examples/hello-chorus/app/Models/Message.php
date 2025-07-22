<?php

namespace App\Models;

use App\Actions\WriteActions\CreateMessageAction;
use App\Actions\WriteActions\DeleteMessageAction;
use App\Actions\WriteActions\UpdateMessageAction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Pixelsprout\LaravelChorus\Traits\Harmonics;

class Message extends Model
{
    use Harmonics, HasFactory;

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
        'tenant_id',
        'platform_id',
        'created_at',
        'updated_at',
    ];

    /**
     * Define write actions for this model
     */
    protected $writeActions = [
        'create' => CreateMessageAction::class,
        'update' => UpdateMessageAction::class,
        'delete' => DeleteMessageAction::class,
    ];

    /**
     * Filter messages to only sync those belonging to the current user
     */
    protected function syncFilter(): Builder
    {
        $user = auth()->user();

        if (!$user) {
            return static::query()->whereRaw('1 = 0'); // No user, no messages
        }

        $allowedPlatformIds = $user->platforms->pluck('id');

        return static::query()
            ->where('tenant_id', $user->tenant_id)
            ->whereIn('platform_id', $allowedPlatformIds);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function platform(): BelongsTo
    {
        return $this->belongsTo(Platform::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
