<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Support;

enum JSType: string
{
    case String = 'string';
    case Number = 'number';
    case Boolean = 'boolean';
    case Object = 'object';
    case Array = 'array';
    case Any = 'any';
}