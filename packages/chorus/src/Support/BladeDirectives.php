<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Support;

use Illuminate\Support\Facades\Blade;

final class BladeDirectives
{
    /**
     * Register all Chorus Blade directives
     */
    public static function register(): void
    {
        static::registerChorusDirective();
    }

    /**
     * Register the @chorus directive for Chorus configuration
     */
    private static function registerChorusDirective(): void
    {
        Blade::directive('chorus', function ($expression) {
            return "<?php echo app('chorus.blade')->render({$expression}); ?>";
        });
    }
}
