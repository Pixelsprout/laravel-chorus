<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Support;

use Illuminate\Database\Eloquent\Model;
use Pixelsprout\LaravelChorus\Contracts\PrefixResolver;
use Pixelsprout\LaravelChorus\Support\Resolvers\StaticPrefixResolver;

final class Prefix
{
    public static function resolve(Model $model): string
    {
        $prefix = config('chorus.harmonic_channel_prefix');

        if (is_null($prefix)) {
            return '';
        }

        if (is_string($prefix)) {
            if (class_exists($prefix) && in_array(PrefixResolver::class, class_implements($prefix))) {
                return app($prefix)->resolve($model);
            }

            return (new StaticPrefixResolver($prefix))->resolve($model);
        }

        return '';
    }
}
