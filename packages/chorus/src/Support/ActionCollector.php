<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Support;

use Closure;
use Exception;
use Illuminate\Database\Eloquent\Model;
use Pixelsprout\LaravelChorus\Traits\Harmonics;

final class ActionCollector
{
    private array $operations = [];

    private array $modelProxies = [];

    private bool $collecting = false;

    private array $clientOperations = [];

    private array $consumedOperations = [];

    public function __get(string $tableName): ModelActionProxy
    {
        if (! $this->collecting) {
            throw new Exception('ActionCollector is not currently collecting operations');
        }

        if (! isset($this->modelProxies[$tableName])) {
            $this->modelProxies[$tableName] = new ModelActionProxy($this, $tableName, $this->clientOperations, $this->consumedOperations);
        }

        return $this->modelProxies[$tableName];
    }

    public function startCollecting(array $clientOperations = []): void
    {
        $this->collecting = true;
        $this->operations = [];
        $this->modelProxies = [];
        $this->clientOperations = $clientOperations;
        $this->consumedOperations = [];
    }

    public function stopCollecting(): void
    {
        $this->collecting = false;
    }

    public function isCollecting(): bool
    {
        return $this->collecting;
    }

    public function getOperations(): array
    {
        return $this->operations;
    }

    public function addOperation(string $tableName, string $operation, array $data, mixed $result = null): void
    {
        if (! $this->collecting) {
            throw new Exception('ActionCollector is not currently collecting operations');
        }

        $this->operations[] = [
            'table' => $tableName,
            'operation' => $operation,
            'data' => $data,
            'result' => $result,
            'timestamp' => microtime(true),
        ];
    }

    public function getOperationResults(): array
    {
        $results = [];

        foreach ($this->operations as $index => $operation) {
            $results[] = [
                'success' => true,
                'index' => $index,
                'operation' => [
                    'table' => $operation['table'],
                    'operation' => $operation['operation'],
                    'data' => $operation['data'],
                ],
                'data' => $operation['result'],
            ];
        }

        return $results;
    }

    // Note: Operations are now executed immediately by the proxy methods
    // This method is kept for backwards compatibility but no longer used
}

final class ModelActionProxy
{
    private string $modelClass;

    public function __construct(
        private ActionCollector $collector,
        private string $tableName,
        private array $clientOperations = [],
        private array &$consumedOperations = []
    ) {
        $this->modelClass = $this->findModelClassForTable($tableName);

        if (! $this->modelClass) {
            throw new Exception("No model found for table: {$tableName}");
        }
    }

    public function create(array|Closure $data): Model
    {
        $actualData = $this->resolveOperationData('create', $data);

        $model = new $this->modelClass();
        $result = $model->create($actualData);

        $this->collector->addOperation($this->tableName, 'create', $actualData, $result);

        return $result;
    }

    public function update(array|Closure $data): Model
    {
        $actualData = $this->resolveOperationData('update', $data);

        if (! isset($actualData['id'])) {
            throw new Exception('Update operation requires an id field');
        }

        $model = new $this->modelClass();
        $instance = $model->findOrFail($actualData['id']);
        $instance->update($actualData);
        $result = $instance->fresh();

        $this->collector->addOperation($this->tableName, 'update', $actualData, $result);

        return $result;
    }

    public function delete(mixed $id): bool
    {
        if ($id instanceof Closure) {
            $actualData = $this->resolveOperationData('delete', $id);
            $actualId = $actualData['id'] ?? null;
        } else {
            // Handle both array with id or direct id
            $actualId = is_array($id) ? $id['id'] : $id;
        }

        if (! $actualId) {
            throw new Exception('Delete operation requires an id');
        }

        $model = new $this->modelClass();
        $instance = $model->findOrFail($actualId);
        $result = $instance->delete();

        $this->collector->addOperation($this->tableName, 'delete', ['id' => $actualId], $result);

        return $result;
    }

    private function resolveOperationData(string $operationType, array|Closure $data): array
    {
        if (is_array($data)) {
            // Backwards compatibility - just return the array as-is
            return $data;
        }

        // Find the next unconsumed matching operation from client operations
        $operationKey = $this->tableName.'.'.$operationType;
        $consumedCount = $this->consumedOperations[$operationKey] ?? 0;

        $matchingOperation = null;
        $currentCount = 0;

        foreach ($this->clientOperations as $index => $operation) {
            if ($operation['table'] === $this->tableName && $operation['operation'] === $operationType) {
                if ($currentCount === $consumedCount) {
                    $matchingOperation = $operation;
                    // Mark this operation as consumed
                    $this->consumedOperations[$operationKey] = $consumedCount + 1;
                    break;
                }
                $currentCount++;
            }
        }

        if (! $matchingOperation) {
            throw new Exception("No unconsumed {$operationType} operation found for table {$this->tableName}");
        }

        // Create an object from the operation data
        $operationData = (object) $matchingOperation['data'];

        // Call the closure with the operation data
        $result = $data($operationData);

        if (! is_array($result)) {
            throw new Exception('Closure must return an array of data');
        }

        return $result;
    }

    private function findModelClassForTable(string $tableName): ?string
    {
        // This could be optimized with caching
        $models = ModelsThat::useTrait(Harmonics::class);

        foreach ($models as $modelClass) {
            $model = new $modelClass();
            if ($model->getTable() === $tableName) {
                return $modelClass;
            }
        }

        return null;
    }
}
