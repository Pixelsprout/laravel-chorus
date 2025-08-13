<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Support;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Pixelsprout\LaravelChorus\Contracts\ChorusActionInterface;

abstract class ChorusAction implements ChorusActionInterface
{
    /**
     * Action configuration
     */
    protected array $config = [
        'allowOfflineWrites' => false,
        'supportsBatch' => true,
    ];

    /**
     * Make the action invokable for direct route usage
     */
    public function __invoke(Request $request): mixed
    {
        return $this->handle($request);
    }

    /**
     * Execute the action logic with access to the action collector
     */
    abstract protected function execute(Request $request, ActionCollector $actions): void;

    /**
     * Get validation rules for this action
     */
    abstract public function rules(): array;

    /**
     * Handle an RPC-style action with multiple write operations
     */
    final public function handle(Request $request): mixed
    {
        // Check if this is a new callback-style request with operations
        if ($request->has('operations')) {
            return $this->handleWithOperations($request);
        }

        // Legacy handling - validate the request data
        $data = $request->all();
        $this->validateItem($data);

        $collector = new ActionCollector();

        return DB::transaction(function () use ($request, $collector) {
            $collector->startCollecting();

            try {
                // Execute the user-defined action logic
                $this->execute($request, $collector);

                // Execute all collected operations
                $results = $collector->executeOperations();

                return [
                    'success' => true,
                    'operations' => $results,
                    'summary' => [
                        'total' => count($results),
                        'successful' => count(array_filter($results, fn ($r) => $r['success'])),
                        'failed' => count(array_filter($results, fn ($r) => ! $r['success'])),
                    ],
                ];
            } finally {
                $collector->stopCollecting();
            }
        });
    }

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
                // Create a new request with the item data
                $itemRequest = $request->duplicate();
                $itemRequest->merge($item);

                $result = $this->handle($itemRequest);
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
     * Handle requests with pre-collected operations from the client
     */
    protected function handleWithOperations(Request $request): mixed
    {
        $operations = $request->input('operations', []);

        // Validate that we have operations
        if (empty($operations)) {
            throw new Exception('No operations provided');
        }

        $collector = new ActionCollector();

        return DB::transaction(function () use ($collector, $operations) {
            $collector->startCollecting();

            try {
                // Add the operations from the client to the collector
                foreach ($operations as $operation) {
                    $collector->addOperation(
                        $operation['table'],
                        $operation['operation'],
                        $operation['data']
                    );
                }

                // Execute all operations
                $results = $collector->executeOperations();

                return [
                    'success' => true,
                    'operations' => $results,
                    'summary' => [
                        'total' => count($results),
                        'successful' => count(array_filter($results, fn ($r) => $r['success'])),
                        'failed' => count(array_filter($results, fn ($r) => ! $r['success'])),
                    ],
                ];
            } finally {
                $collector->stopCollecting();
            }
        });
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
