<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Pixelsprout\LaravelChorus\Traits\Harmonics;

class Message extends Model {
    use Harmonics;

    protected $syncFields = [
        'body',
        'id',
    ];

    public function user(): BelongsTo {
        return $this->belongsTo(User::class);
    }

    public function platform(): BelongsTo {
        return $this->belongsTo(Platform::class);
    }
}
