<?php

declare(strict_types=1);
/**
 * @author Aaron Francis <aarondfrancis@gmail.com|https://twitter.com/aarondfrancis>
 */

namespace Pixelsprout\LaravelChorus\Support;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use ReflectionClass;

final class ModelsThat
{
    public static function useTrait(string $trait): Collection
    {
        return self::allReflectedModels()
            ->filter(function (ReflectionClass $model) use ($trait) {
                return $model->isInstantiable() &&
                    in_array($trait, $model->getTraitNames());
            })
            ->map->getName()
            ->values();
    }

    private static function allModels(): Collection
    {
        return collect(File::allFiles(app_path('Models')));
    }

    private static function allReflectedModels(): Collection
    {
        return self::allModels()
            ->map(function ($file) {
                $class = static::getClassFromFile($file);

                if (! class_exists($class)) {
                    return false;
                }

                return new ReflectionClass($class);
            })
            ->filter()
            ->values();
    }

    private static function getClassFromFile($file): string
    {
        return Str::of($file)
            ->after(app_path('Models'))
            ->ltrim(DIRECTORY_SEPARATOR)
            ->before('.')
            ->replace('/', '\\')
            ->prepend('App\\Models\\')
            ->value();
    }
}
