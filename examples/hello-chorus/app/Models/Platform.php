<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Pixelsprout\LaravelChorus\Support\JSType;
use Pixelsprout\LaravelChorus\Traits\Harmonics;

class Platform extends Model
{
    use Harmonics, HasFactory;

    protected $fillable = ['name'];

    /**
     * Fields to sync to the client
     */
    protected $syncFields = [
        'id' => JSType::String,
        'name' => JSType::String,
    ];

    // Has many messages
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function users(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    /**
     * Filter platforms to only sync those belonging to the current user
     */
    protected function syncFilter(): Builder
    {
        $user = auth()->user();

        if (! $user) {
            return static::query()->whereRaw('1 = 0'); // No user, no platforms
        }

        return static::query()->whereIn('id', $user->platforms->pluck('id'));
    }
}
