<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Contracts;

use Illuminate\Http\Request;

interface ChorusActionInterface
{
    /**
     * Handle an RPC-style action with multiple write operations
     */
    public function handle(Request $request): mixed;

    /**
     * Handle batch write operations
     */
    public function handleBatch(Request $request, array $items): array;

    /**
     * Get validation rules for this action
     */
    public function rules(): array;

    /**
     * Get the action configuration
     */
    public function getConfig(): array;

    /**
     * Check if this action supports offline writes
     */
    public function allowsOfflineWrites(): bool;

    /**
     * Check if this action supports batch operations
     */
    public function supportsBatch(): bool;
}
