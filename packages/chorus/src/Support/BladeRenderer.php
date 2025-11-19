<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Support;

use Illuminate\Support\Str;

final class BladeRenderer
{
    /**
     * Render the Chorus configuration script
     */
    public function render(mixed $expression = null): string
    {
        $config = $this->parseExpression($expression);

        // Add current user ID to config
        $config['userId'] = auth()->id();

        $configJson = json_encode($config, JSON_UNESCAPED_SLASHES);

        return <<<HTML
<script>
window.chorusConfig = {$configJson};
</script>
HTML;
    }

    /**
     * Parse the blade directive expression into a configuration array
     */
    private function parseExpression(mixed $expression): array
    {
        // If already an array, merge with defaults and return
        if (is_array($expression)) {
            return array_merge($this->getDefaultConfig(), $expression);
        }

        $config = [];

        if (empty($expression)) {
            return $this->getDefaultConfig();
        }

        // Remove outer parentheses if present
        $expression = trim($expression, '()');

        // If it's an array syntax, evaluate it
        if (Str::startsWith($expression, '[') && Str::endsWith($expression, ']')) {
            $config = eval("return {$expression};");
        } else {
            // Try to parse as a simple variable or function call
            try {
                $config = eval("return {$expression};");
            } catch (\Throwable $e) {
                // If parsing fails, treat as default config
                $config = $this->getDefaultConfig();
            }
        }

        return array_merge($this->getDefaultConfig(), $config);
    }

    /**
     * Get the default Chorus configuration
     */
    private function getDefaultConfig(): array
    {
        return [
            'endpoint' => '/api',
            'websocketUrl' => config('reverb.default_host', 'ws://localhost:8080'),
            'debugMode' => config('app.debug', false),
        ];
    }

    /**
     * Get the current user ID for JavaScript
     */
    private function getCurrentUserId(): string
    {
        $userId = auth()->id();

        return $userId ? (string) $userId : 'null';
    }
}
