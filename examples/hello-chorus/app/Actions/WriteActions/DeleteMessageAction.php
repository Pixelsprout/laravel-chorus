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
}
