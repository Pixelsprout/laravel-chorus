<?php

namespace App\Actions\ChorusActions;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Pixelsprout\LaravelChorus\Support\ChorusAction;

final class UpdateMessageAction extends ChorusAction
{
    public function rules(): array
    {
        return [
            'messages.update' => [
                'id' => 'required|string|exists:messages,id',
                'body' => 'required|string|max:1000',
            ],
            'users.update' => [
                'id' => 'required|string|exists:users,id',
                'last_activity_at' => 'required|date',
            ],
            'data' => [
                'test_item' => 'required|string',
            ],
        ];
    }

    public function handle(Request $request): void
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        // Update the message using request data
        $messageUpdateOperation = $this->getOperations('messages', 'update');

        if (empty($messageUpdateOperation)) {
            throw new \Exception('No message data found in request');
        }

        // Verify the message belongs to the user's tenant
        foreach ($messageUpdateOperation as $messageData) {
            $message = Message::where('id', $messageData['id'])
                ->where('tenant_id', $user->tenant_id)
                ->first();

            if (!$message) {
                throw new \Exception('Message not found or unauthorized');
            }

            // Update the message
            $message->update([
                'body' => $messageData['body'],
            ]);
        }

        // Update user's last activity
        User::where('id', $user->id)->update([
            'last_activity_at' => now(),
        ]);
    }
}
