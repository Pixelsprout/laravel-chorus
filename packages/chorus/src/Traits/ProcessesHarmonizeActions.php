<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Traits;

use Illuminate\Validation\ValidationException;
use Pixelsprout\LaravelChorus\Attributes\Harmonize;
use ReflectionClass;
use ReflectionMethod;

/**
 * Trait for Livewire components to process Harmonize actions.
 *
 * This trait provides helper methods for working with operations
 * collected by the client-side operation collection pattern.
 *
 * Important: For create operations, the client generates a UUID that is included
 * in the operation data. Use this `id` when creating your models to ensure that
 * harmonic events can be matched with optimistic updates:
 *
 *     Todo::create([
 *         'id' => $todoData['id'],  // Use the client-provided UUID
 *         'title' => $todoData['title'],
 *     ]);
 *
 * This allows the client to recognize the resolved backend record as matching
 * the optimistic shadow item, triggering shadow removal and replacement with
 * the synced version.
 */
trait ProcessesHarmonizeActions
{
    /**
     * Get harmonize metadata for all methods in this component
     *
     * @return array<string, array{tables: array, operations: array, supportsBatch: bool}>
     */
    public function getHarmonizeMetadata(): array
    {
        $reflection = new ReflectionClass($this);
        $metadata = [];

        foreach ($reflection->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
            $attributes = $method->getAttributes(Harmonize::class);

            if (empty($attributes)) {
                continue;
            }

            $attribute = $attributes[0]->newInstance();
            $metadata[$method->getName()] = [
                'tables' => $attribute->tables,
                'operations' => $attribute->operations,
                'supportsBatch' => $attribute->supportsBatch,
            ];
        }

        return $metadata;
    }

    /**
     * Validate operations against allowed tables and operations
     *
     * @param  array<array{table: string, operation: string, data: array}>  $operations
     * @param  array<string>  $allowedTables
     * @param  array<string>  $allowedOperations
     *
     * @throws ValidationException
     */
    protected function validateOperations(
        array $operations,
        array $allowedTables = [],
        array $allowedOperations = ['create', 'update', 'delete']
    ): void {
        foreach ($operations as $index => $operation) {
            // Check operation structure
            if (! isset($operation['table']) || ! isset($operation['operation']) || ! isset($operation['data'])) {
                throw ValidationException::withMessages([
                    "operations.{$index}" => "Operation must have 'table', 'operation', and 'data' keys",
                ]);
            }

            // Check if table is allowed (if specified)
            if (! empty($allowedTables) && ! in_array($operation['table'], $allowedTables, true)) {
                throw ValidationException::withMessages([
                    "operations.{$index}.table" => "Table '{$operation['table']}' is not allowed for this action",
                ]);
            }

            // Check if operation is allowed
            if (! in_array($operation['operation'], $allowedOperations, true)) {
                throw ValidationException::withMessages([
                    "operations.{$index}.operation" => "Operation '{$operation['operation']}' is not allowed",
                ]);
            }
        }
    }

    /**
     * Filter operations by table and operation type
     *
     * @param  array<array{table: string, operation: string, data: array}>  $operations
     * @return array<array{table: string, operation: string, data: array}>
     */
    protected function filterOperations(
        array $operations,
        string $table,
        string $operation
    ): array {
        return array_filter(
            $operations,
            fn ($op) => $op['table'] === $table && $op['operation'] === $operation
        );
    }

    /**
     * Get operation data for a specific table and operation type
     *
     * @param  array<array{table: string, operation: string, data: array}>  $operations
     * @return array<array>
     */
    protected function getOperationData(
        array $operations,
        string $table,
        string $operation
    ): array {
        $filtered = $this->filterOperations($operations, $table, $operation);

        return array_map(fn ($op) => $op['data'], $filtered);
    }

    /**
     * Organize operations by table and operation type
     *
     * @param  array<array{table: string, operation: string, data: array}>  $operations
     * @return array<string, array<string, array<array>>>
     */
    protected function organizeOperations(array $operations): array
    {
        $organized = [];

        foreach ($operations as $operation) {
            $table = $operation['table'];
            $operationType = $operation['operation'];

            if (! isset($organized[$table])) {
                $organized[$table] = [];
            }

            if (! isset($organized[$table][$operationType])) {
                $organized[$table][$operationType] = [];
            }

            $organized[$table][$operationType][] = $operation['data'];
        }

        return $organized;
    }
}
