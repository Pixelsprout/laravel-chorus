<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Support;

use Exception;
use Illuminate\Database\Eloquent\Model;
use Pixelsprout\LaravelChorus\Support\ModelsThat;
use Pixelsprout\LaravelChorus\Traits\Harmonics;

final class ActionCollector
{
    public ModelActionProxy $messages;
    private array $operations = [];
    private array $modelProxies = [];
    private bool $collecting = false;

    public function startCollecting(): void
    {
        $this->collecting = true;
        $this->operations = [];
        $this->modelProxies = [];
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

    public function __get(string $tableName): ModelActionProxy
    {
        if (!$this->collecting) {
            throw new Exception('ActionCollector is not currently collecting operations');
        }

        if (!isset($this->modelProxies[$tableName])) {
            $this->modelProxies[$tableName] = new ModelActionProxy($this, $tableName);
        }

        return $this->modelProxies[$tableName];
    }

    public function addOperation(string $tableName, string $operation, array $data): void
    {
        if (!$this->collecting) {
            throw new Exception('ActionCollector is not currently collecting operations');
        }

        $this->operations[] = [
            'table' => $tableName,
            'operation' => $operation,
            'data' => $data,
            'timestamp' => microtime(true),
        ];
    }

    public function executeOperations(): array
    {
        $results = [];

        foreach ($this->operations as $index => $operation) {
            try {
                $result = $this->executeOperation($operation);
                $results[] = [
                    'success' => true,
                    'index' => $index,
                    'operation' => $operation,
                    'data' => $result,
                ];
            } catch (Exception $e) {
                $results[] = [
                    'success' => false,
                    'index' => $index,
                    'operation' => $operation,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }

    private function executeOperation(array $operation): mixed
    {
        $tableName = $operation['table'];
        $operationType = $operation['operation'];
        $data = $operation['data'];

        // Find the model class for this table
        $modelClass = $this->findModelClassForTable($tableName);
        if (!$modelClass) {
            throw new Exception("No model found for table: {$tableName}");
        }

        $model = new $modelClass();

        return match ($operationType) {
            'create' => $model->create($data),
            'update' => $this->updateModel($model, $data),
            'delete' => $this->deleteModel($model, $data),
            default => throw new Exception("Unsupported operation: {$operationType}"),
        };
    }

    private function updateModel(Model $model, array $data): Model
    {
        if (!isset($data['id'])) {
            throw new Exception('Update operation requires an id field');
        }

        $instance = $model->findOrFail($data['id']);
        $instance->update($data);
        return $instance->fresh();
    }

    private function deleteModel(Model $model, array $data): bool
    {
        if (!isset($data['id'])) {
            throw new Exception('Delete operation requires an id field');
        }

        $instance = $model->findOrFail($data['id']);
        return $instance->delete();
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

final class ModelActionProxy
{
    public function __construct(
        private ActionCollector $collector,
        private string $tableName
    ) {}

    public function create(array $data): void
    {
        $this->collector->addOperation($this->tableName, 'create', $data);
    }

    public function update(array $data): void
    {
        $this->collector->addOperation($this->tableName, 'update', $data);
    }

    public function delete(array $data): void
    {
        $this->collector->addOperation($this->tableName, 'delete', $data);
    }
}