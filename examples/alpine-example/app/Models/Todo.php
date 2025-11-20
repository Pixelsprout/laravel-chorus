<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Pixelsprout\LaravelChorus\Traits\Harmonics;

class Todo extends Model
{
    /** @use HasFactory<\Database\Factories\TodoFactory> */
    use HasFactory, Harmonics;

    protected $guarded = [];

    protected array $syncFields = ['title', 'completed_at', 'created_at', 'updated_at'];

    protected function syncFilter(): Builder
    {
        return static::query();
    }
}
