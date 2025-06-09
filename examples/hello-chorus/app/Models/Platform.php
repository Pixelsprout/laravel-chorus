<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Platform extends Model
{
    // Has many messages
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }
}
