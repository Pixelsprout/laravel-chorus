<?php

namespace App\Actions\WriteActions;

use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Pixelsprout\LaravelChorus\Models\Harmonic;
use Pixelsprout\LaravelChorus\Support\WriteAction;

class CreateMessageAction extends WriteAction
{
    protected array $config = [
        'allowOfflineWrites' => true,
        'supportsBatch' => true,
        'maxBatchSize' => 50,
    ];

    public function handle(Request $request, array $data): Message
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        // Create the message
        $message = Message::create([
            'id' => $data['id'] ?? null,
            'body' => $data['message'],
            'platform_id' => $data['platformId'],
            'user_id' => $user->id,
            'tenant_id' => $user->tenant_id,
        ]);

        return $message;
    }

    public function rules(): array
    {
        return [
            'message' => 'required|string|max:255',
            'platformId' => 'required|string|uuid|exists:platforms,id',
            'id' => 'nullable|string|uuid',
        ];
    }

    public function getModelClass(): string
    {
        return Message::class;
    }

    /**
     * Override handleBatch to use more efficient bulk creation
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
        $validItems = [];

        // Validate all items first
        foreach ($items as $index => $item) {
            try {
                $this->validateItem($item);
                $validItems[] = [
                    'index' => $index,
                    'data' => $item,
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

        // Bulk create valid items
        if (!empty($validItems)) {
            $messagesToCreate = [];
            foreach ($validItems as $validItem) {
                $data = $validItem['data'];
                $messagesToCreate[] = [
                    'id' => $data['id'] ?? Str::uuid(),
                    'body' => $data['message'],
                    'platform_id' => $data['platformId'],
                    'user_id' => $user->id,
                    'tenant_id' => $user->tenant_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            try {
                Message::insert($messagesToCreate);

                // Create success results
                foreach ($validItems as $validItem) {
                    $results[] = [
                        'success' => true,
                        'index' => $validItem['index'],
                        'data' => $validItem['data'],
                    ];
                }
            } catch (\Exception $e) {
                // If bulk insert fails, fall back to individual creation
                foreach ($validItems as $validItem) {
                    try {
                        $message = $this->handle($request, $validItem['data']);
                        $results[] = [
                            'success' => true,
                            'index' => $validItem['index'],
                            'data' => $message,
                        ];
                    } catch (\Exception $individualError) {
                        $errors[] = [
                            'success' => false,
                            'index' => $validItem['index'],
                            'error' => $individualError->getMessage(),
                        ];
                    }
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
