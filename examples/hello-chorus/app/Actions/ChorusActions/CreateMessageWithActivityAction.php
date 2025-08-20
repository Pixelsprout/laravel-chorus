<?php

namespace App\Actions\ChorusActions;

use App\Models\Message;
use App\Models\User;
use App\Models\Platform;
use Illuminate\Http\Request;
use Pixelsprout\LaravelChorus\Support\ChorusAction;

final class CreateMessageWithActivityAction extends ChorusAction
{
    public function handle(Request $request): void
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        // Access any additional data sent from the client
        $additionalData = $request->input('data', []);
        if (!empty($additionalData)) {
            \Log::info('Received additional data from client:', $additionalData);
        }

        // Get all message create operations
        $messageOperations = $this->getOperations('messages', 'create');

        foreach ($messageOperations as $messageData) {
            Message::create([
                'id' => $messageData['id'],
                'body' => $messageData['body'],
                'platform_id' => $messageData['platform_id'],
                'user_id' => $user->id,
                'tenant_id' => $user->tenant_id,
            ]);
        }

        // Update user's last activity (handled automatically by the action)
        User::where('id', $user->id)->update([
            'last_activity_at' => now(),
        ]);

        // Update platform metrics (handled automatically by the action)
        $platformOperations = $this->getOperations('platforms', 'update');
        foreach ($platformOperations as $platformData) {
            Platform::where('id', $platformData['id'])->update([
                'last_message_at' => now(),
            ]);
        }
    }

    public function rules(): array {
        return [
            'messages.create' => [
                'id' => 'nullable|string|uuid',
                'body' => 'required|string|max:1000',
                'platform_id' => 'required|string|uuid|exists:platforms,id',
                'user_id' => 'required|string|uuid|exists:users,id',
                'tenant_id' => 'required|integer|exists:tenants,id',
            ],
            'users.update' => [
                'id' => 'required|string|uuid|exists:users,id',
                'last_activity_at' => 'required|date',
            ],
            'platforms.update' => [
                'id' => 'required|string|uuid|exists:platforms,id',
                'last_message_at' => 'nullable|date',
            ],
            'data' => [
                'test_item' => 'required|string',
            ],
        ];
    }
}
