<?php

namespace Pixelsprout\LaravelChorus\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Pixelsprout\LaravelChorus\Contracts\WriteActionInterface;

abstract class WriteAction implements WriteActionInterface
{
    /**
     * Action configuration
     */
    protected array $config = [
        'allowOfflineWrites' => false,
        'supportsBatch' => true,
        'maxBatchSize' => 100,
    ];

    /**
     * Handle a single item write operation
     */
    abstract public function handle(Request $request, array $data): mixed;

    /**
     * Get validation rules for this action
     */
    abstract public function rules(): array;

    /**
     * Handle batch write operations
     */
    public function handleBatch(Request $request, array $items): array
    {
        if (!$this->supportsBatch()) {
            throw new \Exception('This action does not support batch operations');
        }

        if (count($items) > $this->config['maxBatchSize']) {
            throw new \Exception("Batch size exceeds maximum of {$this->config['maxBatchSize']}");
        }

        $results = [];
        $errors = [];

        foreach ($items as $index => $item) {
            try {
                $this->validateItem($item);
                $result = $this->handle($request, $item);
                $results[] = [
                    'success' => true,
                    'index' => $index,
                    'data' => $result,
                ];
            } catch (ValidationException $e) {
                $errors[] = [
                    'success' => false,
                    'index' => $index,
                    'error' => 'Validation failed',
                    'validation_errors' => $e->errors(),
                ];
            } catch (\Exception $e) {
                $errors[] = [
                    'success' => false,
                    'index' => $index,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'results' => array_merge($results, $errors),
            'summary' => [
                'total' => count($items),
                'successful' => count($results),
                'failed' => count($errors),
            ],
        ];
    }

    /**
     * Validate a single item
     */
    protected function validateItem(array $data): void
    {
        $validator = Validator::make($data, $this->rules());

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }
    }

    /**
     * Get the action configuration
     */
    public function getConfig(): array
    {
        return $this->config;
    }

    /**
     * Check if this action supports offline writes
     */
    public function allowsOfflineWrites(): bool
    {
        return $this->config['allowOfflineWrites'] ?? false;
    }

    /**
     * Check if this action supports batch operations
     */
    public function supportsBatch(): bool
    {
        return $this->config['supportsBatch'] ?? true;
    }

    /**
     * Set configuration options
     */
    public function setConfig(array $config): void
    {
        $this->config = array_merge($this->config, $config);
    }

    /**
     * Get the action name (used for routing and frontend)
     */
    public function getName(): string
    {
        $className = class_basename(static::class);
        
        // Convert "CreateMessageAction" to "create"
        if (str_ends_with($className, 'Action')) {
            $className = substr($className, 0, -6);
        }

        return strtolower(preg_replace('/([A-Z])/', '_$1', lcfirst($className)));
    }

    /**
     * Get the model class this action operates on
     */
    abstract public function getModelClass(): string;
}