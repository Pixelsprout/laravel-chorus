<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Support;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Pixelsprout\LaravelChorus\Contracts\ChorusActionInterface;

abstract class ChorusAction implements ChorusActionInterface
{
    /**
     * Organized operations data for access by getOperations method
     */
    protected array $operations = [];

    /**
     * Make the action invokable for direct route usage
     */
    public function __invoke(Request $request): mixed
    {
        return $this->processAction($request);
    }

    /**
     * Handle the action logic with access to the request data
     * Override this method for simplified API usage
     */
    abstract public function handle(Request $request): void;

    /**
     * Get validation rules for specific operations and data field
     * Returns array with 'table.operation' => ['field' => 'rules'] format for operations
     * and 'data' => ['field' => 'rules'] format for data field validation
     */
    abstract public function rules(): array;

    /**
     * Process an RPC-style action with multiple write operations
     */
    final public function processAction(Request $request): mixed
    {
        $operations = $request->input('operations', []);

        // Normalize single operation shorthand
        $operations = $this->normalizeSingleOperationFormat($operations);

        // Detect if we have multiple executions based on operation patterns
        $executionGroups = $this->detectMultipleExecutions($operations);

        if (count($executionGroups) > 1) {
            return $this->processMultipleExecutionGroups($request, $executionGroups);
        }

        // Single execution (normal flow)
        return $this->processSingleExecution($request, $operations);
    }

    /**
     * Handle batch write operations
     */
    final public function handleBatch(Request $request, array $items): array
    {
        $results = [];
        $errors = [];

        foreach ($items as $index => $item) {
            try {
                // Create a new request with the item data
                $itemRequest = $request->duplicate();
                $itemRequest->merge($item);

                $result = $this->processAction($itemRequest);
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
     * Get all operations for an entity and operation type
     */
    protected function getOperations(string $entity, string $operation): array
    {
        $key = "{$entity}.{$operation}";

        return $this->operations[$key] ?? [];
    }

    /**
     * Validate operations using table.operation-specific rules
     */
    protected function validateOperations(array $operations): void
    {
        $operationRules = $this->rules();

        if (empty($operationRules)) {
            return; // No operation validation rules defined
        }

        foreach ($operations as $index => $operation) {
            $table = $operation['table'] ?? null;
            $operationType = $operation['operation'] ?? null;
            $data = $operation['data'] ?? [];

            if (! $table || ! $operationType) {
                throw new ValidationException(
                    Validator::make([], ['operation' => 'required'])
                        ->errors()
                        ->add('operation', "Operation #{$index} is missing table or operation type")
                );
            }

            $ruleKey = "{$table}.{$operationType}";

            if (isset($operationRules[$ruleKey])) {
                $validator = Validator::make($data, $operationRules[$ruleKey]);

                if ($validator->fails()) {
                    $errors = $validator->errors();

                    // Prefix error messages with operation context
                    $contextualErrors = [];
                    foreach ($errors->messages() as $field => $messages) {
                        $contextualErrors["{$ruleKey}.{$field}"] = array_map(
                            fn ($message) => "Operation #{$index} ({$ruleKey}): {$message}",
                            $messages
                        );
                    }

                    $contextualValidator = Validator::make([], []);
                    foreach ($contextualErrors as $field => $messages) {
                        foreach ($messages as $message) {
                            $contextualValidator->errors()->add($field, $message);
                        }
                    }

                    throw new ValidationException($contextualValidator);
                }
            }
        }
    }

    /**
     * Validate data field using data-specific rules
     */
    protected function validateData(array $data): void
    {
        $allRules = $this->rules();
        $dataRules = $allRules['data'] ?? [];

        if (empty($dataRules)) {
            return; // No data validation rules defined
        }

        $validator = Validator::make($data, $dataRules);

        if ($validator->fails()) {
            $errors = $validator->errors();

            // Prefix error messages with data context
            $contextualErrors = [];
            foreach ($errors->messages() as $field => $messages) {
                $contextualErrors["data.{$field}"] = array_map(
                    fn ($message) => "Data validation failed: {$message}",
                    $messages
                );
            }

            $contextualValidator = Validator::make([], []);
            foreach ($contextualErrors as $field => $messages) {
                foreach ($messages as $message) {
                    $contextualValidator->errors()->add($field, $message);
                }
            }

            throw new ValidationException($contextualValidator);
        }
    }

    /**
     * Process a single execution
     */
    private function processSingleExecution(Request $request, array $operations): array
    {
        // Create a clean request with operations organized by table.operation and any additional data
        $cleanRequest = new Request();
        $organizedOperations = $this->organizeOperationsByType($operations);

        // Store organized operations in class property for getOperations method access
        $this->operations = $organizedOperations;

        $cleanRequest->merge([
            'operations' => $organizedOperations,
            'data' => $request->input('data', []),
        ]);

        // Validate individual operations
        $this->validateOperations($operations);

        // Validate data field if present
        $this->validateData($request->input('data', []));

        // Execute the user-defined action logic
        $actionResult = $this->handle($cleanRequest);

        // Convert operations to results format expected by client
        $results = [];
        foreach ($operations as $index => $operation) {
            $results[] = [
                'success' => true,
                'index' => $index,
                'operation' => [
                    'table' => $operation['table'],
                    'operation' => $operation['operation'],
                    'data' => $operation['data'],
                ],
                'data' => $actionResult, // Include any data returned by the action
            ];
        }

        return [
            'success' => true,
            'operations' => $results,
            'summary' => [
                'total' => count($results),
                'successful' => count($results),
                'failed' => 0,
            ],
        ];
    }

    /**
     * Organize operations by table.operation type for easy access
     * Returns structure: ['table.operation' => [operation_data, ...]]
     */
    private function organizeOperationsByType(array $operations): array
    {
        $organized = [];

        foreach ($operations as $operation) {
            $table = $operation['table'];
            $operationType = $operation['operation'];
            $key = "{$table}.{$operationType}";

            if (! isset($organized[$key])) {
                $organized[$key] = [];
            }

            $organized[$key][] = $operation['data'];
        }

        return $organized;
    }

    /**
     * Detect multiple executions by grouping operations
     */
    private function detectMultipleExecutions(array $operations): array
    {
        // Group operations by their table.operation combination
        $operationCounts = [];
        foreach ($operations as $operation) {
            $key = $operation['table'].'.'.$operation['operation'];
            $operationCounts[$key] = ($operationCounts[$key] ?? 0) + 1;
        }

        // Find the maximum count - this determines the number of executions
        $maxCount = max(array_values($operationCounts));

        if ($maxCount <= 1) {
            return [$operations]; // Single execution
        }

        // Group operations into separate executions
        $executionGroups = array_fill(0, $maxCount, []);
        $operationCounters = array_fill_keys(array_keys($operationCounts), 0);

        foreach ($operations as $operation) {
            $key = $operation['table'].'.'.$operation['operation'];
            $executionIndex = $operationCounters[$key];

            $executionGroups[$executionIndex][] = $operation;
            $operationCounters[$key]++;
        }

        return $executionGroups;
    }

    /**
     * Process multiple action execution groups
     */
    private function processMultipleExecutionGroups(Request $request, array $executionGroups): array
    {
        $allResults = [];
        $totalSuccess = 0;
        $totalFailed = 0;

        foreach ($executionGroups as $executionIndex => $operations) {
            try {
                // Validate operations for this execution
                $this->validateOperations($operations);

                // Validate data field if present
                $this->validateData($request->input('data', []));

                // Create a clean request for this execution
                $executionRequest = new Request();
                $organizedOperations = $this->organizeOperationsByType($operations);

                // Store organized operations in class property for getOperations method access
                $this->operations = $organizedOperations;

                $executionRequest->merge([
                    'operations' => $organizedOperations,
                    'data' => $request->input('data', []),
                ]);

                // Execute the user-defined action logic for this execution
                $actionResult = $this->handle($executionRequest);

                // Convert operations to results format for this execution
                foreach ($operations as $operation) {
                    $allResults[] = [
                        'success' => true,
                        'index' => count($allResults),
                        'operation' => [
                            'table' => $operation['table'],
                            'operation' => $operation['operation'],
                            'data' => $operation['data'],
                        ],
                        'data' => $actionResult,
                    ];
                    $totalSuccess++;
                }
            } catch (Exception $e) {
                // If an execution fails, mark all its operations as failed
                foreach ($operations as $opIndex => $operation) {
                    $allResults[] = [
                        'success' => false,
                        'index' => count($allResults),
                        'operation' => [
                            'table' => $operation['table'] ?? 'unknown',
                            'operation' => $operation['operation'] ?? 'unknown',
                            'data' => $operation['data'] ?? [],
                        ],
                        'error' => "Execution #{$executionIndex} failed: ".$e->getMessage(),
                    ];
                    $totalFailed++;
                }
            }
        }

        return [
            'success' => $totalFailed === 0,
            'operations' => $allResults,
            'summary' => [
                'total' => count($allResults),
                'successful' => $totalSuccess,
                'failed' => $totalFailed,
            ],
            'executions_processed' => count($executionGroups),
        ];
    }

    /**
     * Extract request data from client operations for validation
     */
    private function extractRequestDataFromOperations(array $operations): array
    {
        $requestData = [];

        foreach ($operations as $operation) {
            $data = $operation['data'] ?? [];
            $requestData = array_merge($requestData, $data);
        }

        return $requestData;
    }

    /**
     * Normalize single operation shorthand format
     * If there's only one operation rule and operations is a single object, convert it
     */
    private function normalizeSingleOperationFormat(array $operations): array
    {
        $operationRules = $this->rules();

        // Only apply shorthand if there's exactly one operation rule
        if (count($operationRules) !== 1) {
            return $operations;
        }

        // Check if operations looks like shorthand (single object without operation structure)
        if (! empty($operations) && ! $this->isOperationStructure($operations)) {
            $operationKey = array_key_first($operationRules);
            [$table, $operation] = explode('.', $operationKey, 2);

            // Convert shorthand to full operation structure
            return [[
                'table' => $table,
                'operation' => $operation,
                'data' => $operations,
            ]];
        }

        return $operations;
    }

    /**
     * Check if the array looks like an operation structure
     */
    private function isOperationStructure(array $data): bool
    {
        // If it's a numeric array with operation objects, it's operation structure
        if (array_is_list($data) && ! empty($data)) {
            $firstItem = $data[0];

            return is_array($firstItem) &&
                   isset($firstItem['table']) &&
                   isset($firstItem['operation']) &&
                   isset($firstItem['data']);
        }

        // If it has table/operation/data keys at the root level, it might be operation structure
        return isset($data['table']) && isset($data['operation']) && isset($data['data']);
    }
}
