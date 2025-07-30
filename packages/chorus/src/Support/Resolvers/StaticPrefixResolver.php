<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Support\Resolvers;

use Illuminate\Database\Eloquent\Model;
use Pixelsprout\LaravelChorus\Contracts\PrefixResolver;

final class StaticPrefixResolver implements PrefixResolver
{
    public function __construct(private string $prefix) {}

    public function resolve(Model $model): string
    {
        return $this->prefix;
    }
}
