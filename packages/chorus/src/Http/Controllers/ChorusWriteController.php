<?php

namespace Pixelsprout\LaravelChorus\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Pixelsprout\LaravelChorus\Models\Harmonic;
use Pixelsprout\LaravelChorus\Support\ModelsThat;
use Pixelsprout\LaravelChorus\Traits\Harmonics;

class ChorusWriteController extends Controller
{
    /**
     * Handle write action for a specific model and action
     */
    public function handleAction(Request $request, string $tableName, string $actionName): JsonResponse
    {
        try {
            // Find the model class by table name
            $modelClass = $this->getModelClassByTableName($tableName);
            
            if (!$modelClass) {
                return response()->json([
                    'success' => false,
                    'error' => "Model not found for table: {$tableName}"
                ], 404);
            }

            // Get the model instance to access write actions
            $model = new $modelClass();
            $action = $model->getWriteAction($actionName);

            if (!$action) {
                return response()->json([
                    'success' => false,
                    'error' => "Action '{$actionName}' not found for model: {$modelClass}"
                ], 404);
            }

            // Check if this is a batch request
            $isBatch = $request->has('items') || $request->has('batch');
            
            if ($isBatch) {
                return $this->handleBatchAction($request, $action, $tableName, $actionName);
            } else {
                return $this->handleSingleAction($request, $action, $tableName, $actionName);
            }

        } catch (\Exception $e) {
            Log::error('Chorus write action failed', [
                'table' => $tableName,
                'action' => $actionName,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Internal server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle single action execution
     */
    protected function handleSingleAction(Request $request, object $action, string $tableName, string $actionName): JsonResponse
    {
        try {
            $data = $request->all();
            
            // Validate the data first
            $validator = Validator::make($data, $action->rules());
            if ($validator->fails()) {

                // We create a harmonic that marks the event as rejected.
                // This is so a our frontend can process the failure.
                Harmonic::createValidationRejected(
                    'create',
                    $request->all(),
                    $validator->errors()->first(),
                    auth()->id(),
                    // it's helpful if the id exists as we can then know what event failed on the client-side
                    $request->input('id') ?? Str::uuid()
                );

                // Throw validation exception for Inertia to handle
                throw new ValidationException($validator);
            }
            
            DB::beginTransaction();
            
            $result = $action->handle($request, $data);
            
            DB::commit();

            Log::info('Chorus write action completed', [
                'table' => $tableName,
                'action' => $actionName,
                'success' => true
            ]);

            return response()->json([
                'success' => true,
                'data' => $result,
                'action' => $actionName,
                'table' => $tableName
            ]);

        } catch (ValidationException $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'validation_errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Single action execution failed', [
                'table' => $tableName,
                'action' => $actionName,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle batch action execution
     */
    protected function handleBatchAction(Request $request, object $action, string $tableName, string $actionName): JsonResponse
    {
        if (!$action->supportsBatch()) {
            return response()->json([
                'success' => false,
                'error' => "Action '{$actionName}' does not support batch operations"
            ], 400);
        }

        try {
            $items = $request->input('items', $request->input('batch', []));
            
            if (empty($items)) {
                return response()->json([
                    'success' => false,
                    'error' => 'No items provided for batch operation'
                ], 400);
            }

            DB::beginTransaction();
            
            $result = $action->handleBatch($request, $items);
            
            DB::commit();

            $isFullSuccess = $result['summary']['failed'] === 0;

            Log::info('Chorus batch write action completed', [
                'table' => $tableName,
                'action' => $actionName,
                'total' => $result['summary']['total'],
                'successful' => $result['summary']['successful'],
                'failed' => $result['summary']['failed']
            ]);

            return response()->json([
                'success' => $isFullSuccess,
                'data' => $result,
                'action' => $actionName,
                'table' => $tableName
            ], $isFullSuccess ? 200 : 207); // 207 Multi-Status for partial success

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Batch action execution failed', [
                'table' => $tableName,
                'action' => $actionName,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available actions for a model
     */
    public function getActions(Request $request, string $tableName): JsonResponse
    {
        try {
            $modelClass = $this->getModelClassByTableName($tableName);
            
            if (!$modelClass) {
                return response()->json([
                    'success' => false,
                    'error' => "Model not found for table: {$tableName}"
                ], 404);
            }

            $model = new $modelClass();
            $writeActions = $model->getWriteActions();
            
            $actions = [];
            foreach ($writeActions as $name => $actionConfig) {
                $action = $model->getWriteAction($name);
                if ($action) {
                    $actions[$name] = [
                        'name' => $name,
                        'config' => $action->getConfig(),
                        'rules' => $action->rules(),
                        'allowsOfflineWrites' => $action->allowsOfflineWrites(),
                        'supportsBatch' => $action->supportsBatch(),
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'table' => $tableName,
                'actions' => $actions
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to get actions: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Find model class by table name
     */
    protected function getModelClassByTableName(string $tableName): ?string
    {
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