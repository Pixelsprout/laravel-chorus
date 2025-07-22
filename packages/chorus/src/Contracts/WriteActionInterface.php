<?php

namespace Pixelsprout\LaravelChorus\Contracts;

use Illuminate\Http\Request;

interface WriteActionInterface
{
    /**
     * Handle a single item write operation
     */
    public function handle(Request $request, array $data): mixed;

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