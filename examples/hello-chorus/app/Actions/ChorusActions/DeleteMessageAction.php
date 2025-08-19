<?php

namespace App\Actions\ChorusActions;

use Illuminate\Http\Request;
use Pixelsprout\LaravelChorus\Support\ActionCollector;
use Pixelsprout\LaravelChorus\Support\ChorusAction;

final class DeleteMessageAction extends ChorusAction
{

    public function rules(): array
    {
        return [
            'id' => 'required|string|uuid',
        ];
    }

    public function handle(Request $request): void
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        // Delete the message using the action collector
        $actions->messages->delete(fn($messageData) => [
            'id' => $messageData->id,
        ]);

        // Update user's last activity timestamp
        $actions->users->update([
            'id' => $user->id,
            'last_activity_at' => now(),
        ]);
    }
}
