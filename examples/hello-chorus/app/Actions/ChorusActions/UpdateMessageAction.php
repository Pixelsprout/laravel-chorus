<?php

namespace App\Actions\ChorusActions;

use Illuminate\Http\Request;
use Pixelsprout\LaravelChorus\Support\ActionCollector;
use Pixelsprout\LaravelChorus\Support\ChorusAction;

final class UpdateMessageAction extends ChorusAction
{

    public function rules(): array
    {
        return [
            'id' => 'required|string|uuid',
            'message' => 'required|string|max:255',
        ];
    }

    public function handle(Request $request): void
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        // Update the message using the action collector
        $actions->messages->update(fn($messageData) => [
            'id' => $messageData->id,
            'body' => $messageData->body,
        ]);

        // Update user's last activity timestamp
        $actions->users->update(fn() => [
            'id' => $user->id,
            'last_activity_at' => now(),
        ]);
    }
}
