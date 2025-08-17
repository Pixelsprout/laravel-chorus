<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Http\Controllers;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Pixelsprout\LaravelChorus\Contracts\ChorusActionInterface;
use Pixelsprout\LaravelChorus\Models\Harmonic;

final class ChorusActionController extends Controller
{
    /**
     * Handle a chorus action invocation
     */
    public function __invoke(Request $request, string $actionClass): JsonResponse
    {
        try {
            // Validate that the action class exists and implements ChorusActionInterface
            if (! class_exists($actionClass)) {
                return response()->json([
                    'success' => false,
                    'error' => "Action class not found: {$actionClass}",
                ], 404);
            }

            $action = app($actionClass);

            if (! $action instanceof ChorusActionInterface) {
                return response()->json([
                    'success' => false,
                    'error' => "Class {$actionClass} does not implement ChorusActionInterface",
                ], 400);
            }

            // Check if this is a batch request
            $isBatch = $request->has('items') || $request->has('batch');

            if ($isBatch) {
                return $this->handleBatchAction($request, $action, $actionClass);
            }

            return $this->handleSingleAction($request, $action, $actionClass);

        } catch (Exception $e) {
            Log::error('Chorus action failed', [
                'action_class' => $actionClass,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Internal server error: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle single action execution
     */
    protected function handleSingleAction(Request $request, ChorusActionInterface $action, string $actionClass): JsonResponse
    {
        try {
            $result = $action->handle($request);

            Log::info('Chorus action completed', [
                'action_class' => $actionClass,
                'success' => true,
            ]);

            return response()->json([
                'success' => true,
                'data' => $result,
                'action_class' => $actionClass,
            ]);

        } catch (ValidationException $e) {
            // Create a harmonic that marks the event as rejected
            Harmonic::createValidationRejected(
                'action',
                $request->all(),
                $e->errors()->first() ?? 'Validation failed',
                auth()->id(),
                $request->input('id') ?? Str::uuid()
            );

            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'validation_errors' => $e->errors(),
            ], 422);

        } catch (Exception $e) {
            Log::error('Single action execution failed', [
                'action_class' => $actionClass,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle batch action execution
     */
    protected function handleBatchAction(Request $request, ChorusActionInterface $action, string $actionClass): JsonResponse
    {

        try {
            $items = $request->input('items', $request->input('batch', []));

            if (empty($items)) {
                return response()->json([
                    'success' => false,
                    'error' => 'No items provided for batch operation',
                ], 400);
            }

            $result = $action->handleBatch($request, $items);

            $isFullSuccess = $result['summary']['failed'] === 0;

            Log::info('Chorus batch action completed', [
                'action_class' => $actionClass,
                'total' => $result['summary']['total'],
                'successful' => $result['summary']['successful'],
                'failed' => $result['summary']['failed'],
            ]);

            return response()->json([
                'success' => $isFullSuccess,
                'data' => $result,
                'action_class' => $actionClass,
            ], $isFullSuccess ? 200 : 207); // 207 Multi-Status for partial success

        } catch (Exception $e) {
            Log::error('Batch action execution failed', [
                'action_class' => $actionClass,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
