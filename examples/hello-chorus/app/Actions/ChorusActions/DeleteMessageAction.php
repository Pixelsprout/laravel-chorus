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

    protected function handle(Request $request, ActionCollector $actions): void
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        $data = $request->all();

        // Delete the message using the action collector
        $actions->messages->delete([
            'id' => $data['id'],
        ]);

        // Update user's last activity timestamp
        $actions->users->update([
            'id' => $user->id,
            'last_activity_at' => now(),
        ]);
    }
}
