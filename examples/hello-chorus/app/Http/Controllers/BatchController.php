<?php

namespace App\Http\Controllers;

use App\Actions\CreateMessage;
use App\Actions\UpdateMessage;
use App\Actions\DeleteMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BatchController extends Controller
{
    /**
     * Handle batch operations for messages
     */
    public function handleMessages(Request $request)
    {
        $operations = $request->input('operations', []);
        $results = [];

        if (empty($operations)) {
            return response()->json([
                'success' => false,
                'message' => 'No operations provided',
                'results' => []
            ], 400);
        }

        Log::info('Processing batch of ' . count($operations) . ' message operations');

        DB::beginTransaction();

        try {
            foreach ($operations as $index => $operation) {
                $result = $this->processMessageOperation($operation, $index);
                $results[] = $result;
                
                // If any operation fails, we might want to continue or rollback
                // For now, we'll continue processing but mark the failure
                if (!$result['success']) {
                    Log::warning('Batch operation failed', [
                        'index' => $index,
                        'operation' => $operation,
                        'error' => $result['error'] ?? 'Unknown error'
                    ]);
                }
            }

            DB::commit();

            $successCount = collect($results)->where('success', true)->count();
            $failureCount = count($results) - $successCount;

            Log::info('Batch processing completed', [
                'total' => count($results),
                'successful' => $successCount,
                'failed' => $failureCount
            ]);

            return response()->json([
                'success' => $failureCount === 0,
                'message' => "Processed {$successCount} operations successfully, {$failureCount} failed",
                'results' => $results,
                'summary' => [
                    'total' => count($results),
                    'successful' => $successCount,
                    'failed' => $failureCount
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Batch processing failed with exception', [
                'error' => $e->getMessage(),
                'operations_count' => count($operations)
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Batch processing failed: ' . $e->getMessage(),
                'results' => array_fill(0, count($operations), ['success' => false, 'error' => $e->getMessage()])
            ], 500);
        }
    }

    /**
     * Process a single message operation within the batch
     */
    private function processMessageOperation(array $operation, int $index): array
    {
        try {
            $method = strtoupper($operation['method'] ?? '');
            $url = $operation['url'] ?? '';
            $body = $operation['body'] ?? [];

            // Create a mock request for the action
            $mockRequest = new Request();
            $mockRequest->merge($body);
            
            // Extract message ID from URL if present (for update/delete operations)
            $messageId = $this->extractMessageIdFromUrl($url);

            switch ($method) {
                case 'POST':
                    if (str_contains($url, '/messages')) {
                        $action = new CreateMessage();
                        $action->handle($mockRequest);
                        return [
                            'success' => true,
                            'operation_index' => $index,
                            'message' => 'Message created successfully'
                        ];
                    }
                    break;

                case 'PUT':
                case 'PATCH':
                    if (str_contains($url, '/messages') && $messageId) {
                        $action = new UpdateMessage();
                        $action->handle($mockRequest, $messageId);
                        return [
                            'success' => true,
                            'operation_index' => $index,
                            'message' => 'Message updated successfully'
                        ];
                    }
                    break;

                case 'DELETE':
                    if (str_contains($url, '/messages') && $messageId) {
                        $action = new DeleteMessage();
                        $action->handle($mockRequest, $messageId);
                        return [
                            'success' => true,
                            'operation_index' => $index,
                            'message' => 'Message deleted successfully'
                        ];
                    }
                    break;
            }

            return [
                'success' => false,
                'operation_index' => $index,
                'error' => 'Unsupported operation or invalid URL',
                'details' => [
                    'method' => $method,
                    'url' => $url
                ]
            ];

        } catch (\Illuminate\Validation\ValidationException $e) {
            return [
                'success' => false,
                'operation_index' => $index,
                'error' => 'Validation failed',
                'validation_errors' => $e->errors()
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'operation_index' => $index,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Extract message ID from URL
     */
    private function extractMessageIdFromUrl(string $url): ?string
    {
        // Extract ID from URLs like "/messages/123" or "/messages/uuid-string"
        if (preg_match('/\/messages\/([^\/]+)/', $url, $matches)) {
            return $matches[1];
        }
        return null;
    }
}