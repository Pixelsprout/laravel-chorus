<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Attributes;

use Attribute;

/**
 * Marks a Livewire component method as a Chorus action handler.
 *
 * This attribute enables automatic optimistic updates and operation collection
 * for Livewire methods called from Alpine.js using the $wireAction magic.
 *
 * Usage:
 * ```php
 * #[Harmonize]
 * public function createTodo(array $operations): void
 * {
 *     foreach ($operations as $op) {
 *         if ($op['table'] === 'todos' && $op['operation'] === 'create') {
 *             Todo::create($op['data']);
 *         }
 *     }
 * }
 * ```
 */
#[Attribute(Attribute::TARGET_METHOD)]
final class Harmonize
{
    /**
     * @param array<string> $tables List of tables this action can operate on
     * @param array<string> $operations List of allowed operations (create, update, delete)
     * @param bool $supportsBatch Whether this action supports batch operations
     */
    public function __construct(
        public readonly array $tables = [],
        public readonly array $operations = ['create', 'update', 'delete'],
        public readonly bool $supportsBatch = false,
    ) {}
}
