<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Pixelsprout\LaravelChorus\Traits\Harmonics;

class Platform extends Model
{
    use Harmonics;

    protected $fillable = ['name'];

    /**
     * Fields to sync to the client
     */
    protected $syncFields = [
        'id',
        'name',
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
}
