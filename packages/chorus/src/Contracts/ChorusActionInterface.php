<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Contracts;

use Illuminate\Http\Request;

interface ChorusActionInterface
{
    /**
     * Handle an RPC-style action with multiple write operations
     */
    public function processAction(Request $request): mixed;

    /**
     * Handle batch write operations
     */
    public function handleBatch(Request $request, array $items): array;

    /**
     * Get validation rules for this action
     */
    public function rules(): array;
}
