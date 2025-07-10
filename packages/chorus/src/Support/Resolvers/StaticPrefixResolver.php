<?php

namespace Pixelsprout\LaravelChorus\Support\Resolvers;

use Illuminate\Database\Eloquent\Model;
use Pixelsprout\LaravelChorus\Contracts\PrefixResolver;

class StaticPrefixResolver implements PrefixResolver
{
    public function __construct(protected string $prefix)
    {
    }

    public function resolve(Model $model): string
    {
        return $this->prefix;
    }
}