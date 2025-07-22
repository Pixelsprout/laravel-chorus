<?php

namespace App\Actions\WriteActions;

use App\Models\Message;
use Illuminate\Http\Request;
use Pixelsprout\LaravelChorus\Support\WriteAction;

class UpdateMessageAction extends WriteAction
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

        if (!isset($data['id'])) {
            throw new \Exception('Message ID is required for update');
        }

        $message = Message::where('id', $data['id'])
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (!$message) {
            throw new \Exception('Message not found or access denied');
        }

        // Update the message
        $message->update([
            'body' => $data['message'] ?? $message->body,
        ]);

        return $message->fresh();
    }

    public function rules(): array
    {
        return [
            'id' => 'required|string|uuid',
            'message' => 'required|string|max:255',
        ];
    }
}
