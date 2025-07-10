<?php

namespace Pixelsprout\LaravelChorus\Contracts;

use Illuminate\Database\Eloquent\Model;

interface PrefixResolver
{
    /**
     * Resolve the channel prefix for a given model.
     *
     * @param Model $model The model instance for which to resolve the prefix.
     * @return string The resolved channel prefix.
     */
    public function resolve(Model $model): string;
}
