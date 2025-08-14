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

    protected function handle(Request $request, ActionCollector $actions): void
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        $data = $request->all();

        // Update the message using the action collector
        $actions->messages->update([
            'id' => $data['id'],
            'body' => $data['message'],
        ]);

        // Update user's last activity timestamp
        $actions->users->update([
            'id' => $user->id,
            'last_activity_at' => now(),
        ]);
    }
}
