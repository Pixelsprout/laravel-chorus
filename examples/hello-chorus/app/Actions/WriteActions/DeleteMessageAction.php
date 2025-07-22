<?php

namespace App\Actions\WriteActions;

use App\Models\Message;
use Illuminate\Http\Request;
use Pixelsprout\LaravelChorus\Support\WriteAction;

class DeleteMessageAction extends WriteAction
{
    protected array $config = [
        'allowOfflineWrites' => true,
        'supportsBatch' => true,
    ];

    public function handle(Request $request, array $data): array
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        if (!isset($data['id'])) {
            throw new \Exception('Message ID is required for deletion');
        }

        $message = Message::where('id', $data['id'])
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (!$message) {
            throw new \Exception('Message not found or access denied');
        }

        $messageData = $message->toArray();
        $message->delete();

        return [
            'deleted' => true,
            'id' => $data['id'],
            'message' => $messageData,
        ];
    }

    public function rules(): array
    {
        return [
            'id' => 'required|string|uuid',
        ];
    }

    /**
     * Override handleBatch for more efficient bulk deletion
     */
    public function handleBatch(Request $request, array $items): array
    {
        if (!$this->supportsBatch()) {
            throw new \Exception('This action does not support batch operations');
        }

        if (count($items) > $this->config['maxBatchSize']) {
            throw new \Exception("Batch size exceeds maximum of {$this->config['maxBatchSize']}");
        }

        $user = auth()->user();
        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        $results = [];
        $errors = [];
        $idsToDelete = [];

        // Validate all items and collect IDs
        foreach ($items as $index => $item) {
            try {
                $this->validateItem($item);
                $idsToDelete[] = [
                    'index' => $index,
                    'id' => $item['id'],
                ];
            } catch (\Illuminate\Validation\ValidationException $e) {
                $errors[] = [
                    'success' => false,
                    'index' => $index,
                    'error' => 'Validation failed',
                    'validation_errors' => $e->errors(),
                ];
            }
        }

        // Bulk delete valid items
        if (!empty($idsToDelete)) {
            $ids = array_column($idsToDelete, 'id');

            // Get messages that exist and belong to user
            $existingMessages = Message::whereIn('id', $ids)
                ->where('tenant_id', $user->tenant_id)
                ->get()
                ->keyBy('id');

             Message::whereIn('id', $existingMessages->keys())
                ->where('tenant_id', $user->tenant_id)
                ->delete();

            // Create results
            foreach ($idsToDelete as $item) {
                $id = $item['id'];
                if ($existingMessages->has($id)) {
                    $results[] = [
                        'success' => true,
                        'index' => $item['index'],
                        'data' => [
                            'deleted' => true,
                            'id' => $id,
                            'message' => $existingMessages[$id]->toArray(),
                        ],
                    ];
                } else {
                    $errors[] = [
                        'success' => false,
                        'index' => $item['index'],
                        'error' => 'Message not found or access denied',
                    ];
                }
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
}
