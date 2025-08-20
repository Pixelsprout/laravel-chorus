<?php

namespace App\Actions\ChorusActions;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Pixelsprout\LaravelChorus\Support\ChorusAction;

final class DeleteMessageAction extends ChorusAction
{
    public function rules(): array
    {
        return [
            'messages.delete' => [
                'id' => 'required|string|exists:messages,id',
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

        // Delete the message using request data
        $messageData = $request->input('operations')['messages.delete'][0] ?? null;
        
        if (!$messageData) {
            throw new \Exception('No message data found in request');
        }

        // Verify the message belongs to the user's tenant and delete it
        $message = Message::where('id', $messageData['id'])
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (!$message) {
            throw new \Exception('Message not found or unauthorized');
        }

        // Delete the message
        $message->delete();

        // Update user's last activity
        User::where('id', $user->id)->update([
            'last_activity_at' => now(),
        ]);
    }
}
