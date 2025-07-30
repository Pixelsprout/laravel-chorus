<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Support;

use Exception;
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
    final public function handleBatch(Request $request, array $items): array
    {
        if (! $this->supportsBatch()) {
            throw new Exception('This action does not support batch operations');
        }

        $results = [];
        $errors = [];

        foreach ($items as $index => $item) {
            try {
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
            } catch (Exception $e) {
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
     * Get the action configuration
     */
    final public function getConfig(): array
    {
        return $this->config;
    }

    /**
     * Check if this action supports offline writes
     */
    final public function allowsOfflineWrites(): bool
    {
        return $this->config['allowOfflineWrites'] ?? false;
    }

    /**
     * Check if this action supports batch operations
     */
    final public function supportsBatch(): bool
    {
        return $this->config['supportsBatch'] ?? true;
    }

    /**
     * Set configuration options
     */
    final public function setConfig(array $config): void
    {
        $this->config = array_merge($this->config, $config);
    }

    /**
     * Validate a single item
     */
    protected function validateItem(array $data): void
    {
        $validator = Validator::make($data, $this->rules() ?? []);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }
    }
}
