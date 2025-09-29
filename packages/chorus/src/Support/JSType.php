<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Support;

enum JSType: string
{
    case String = 'string';
    case Int = 'int';
    case Number = 'number';
    case Boolean = 'boolean';
    case Array = 'array';
    case Object = 'object';
    case Null = 'null';
    case Undefined = 'undefined';

    public static function union(JSType ...$types): string
    {
        return implode(' | ', array_map(fn ($t) => $t->value, $types));
    }

    public static function arrayOf(JSType $type): string
    {
        return "$type->value[]";
    }

    public static function objectOf(JSType $valueType): string
    {
        return "Record<string, {$valueType->value}>";
    }

    public function optional(): string
    {
        return "$this->value?";
    }
}
