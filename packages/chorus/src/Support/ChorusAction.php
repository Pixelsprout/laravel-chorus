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
     * Make the action invokable for direct route usage
     */
    public function __invoke(Request $request): mixed
    {
        return $this->processAction($request);
    }

    /**
     * Process an RPC-style action with multiple write operations
     */
    public function processAction(Request $request): mixed
    {
        $operations = $request->input('operations', []);
        
        // Normalize single operation shorthand
        $operations = $this->normalizeSingleOperationFormat($operations);
        
        // Create a clean request with only the operations array
        $cleanRequest = new \Illuminate\Http\Request();
        $cleanRequest->merge(['operations' => $operations]);
        
        // Extract request data for validation only
        $requestData = $this->extractRequestDataFromOperations($operations);
        
        
        // Validate individual operations
        $this->validateOperations($operations);
        
        $collector = new ActionCollector();
        $collector->startCollecting($operations);
        
        try {
            // Execute the user-defined action logic
            $this->handle($cleanRequest, $collector);
            
            // Get results of operations that were executed by the user's logic
            $results = $collector->getOperationResults();
            
            return [
                'success' => true,
                'operations' => $results,
                'summary' => [
                    'total' => count($results),
                    'successful' => count(array_filter($results, fn($r) => $r['success'])),
                    'failed' => count(array_filter($results, fn($r) => !$r['success'])),
                ],
            ];
        } finally {
            $collector->stopCollecting();
        }
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
        if (!empty($operations) && !$this->isOperationStructure($operations)) {
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
        if (array_is_list($data) && !empty($data)) {
            $firstItem = $data[0];
            return is_array($firstItem) && 
                   isset($firstItem['table']) && 
                   isset($firstItem['operation']) && 
                   isset($firstItem['data']);
        }
        
        // If it has table/operation/data keys at the root level, it might be operation structure
        return isset($data['table']) && isset($data['operation']) && isset($data['data']);
    }

    /**
     * Handle the action logic with access to the action collector
     */
    abstract protected function handle(Request $request, ActionCollector $actions): void;


    /**
     * Get validation rules for specific operations
     * Returns array with 'table.operation' => ['field' => 'rules'] format
     */
    abstract public function rules(): array;

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
            
            if (!$table || !$operationType) {
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
                            fn($message) => "Operation #{$index} ({$ruleKey}): {$message}",
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
}