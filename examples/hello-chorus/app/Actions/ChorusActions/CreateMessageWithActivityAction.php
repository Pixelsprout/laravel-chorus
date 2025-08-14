<?php

namespace App\Actions\ChorusActions;

use Illuminate\Http\Request;
use Pixelsprout\LaravelChorus\Support\ActionCollector;
use Pixelsprout\LaravelChorus\Support\ChorusAction;
use Illuminate\Support\Str;

final class CreateMessageWithActivityAction extends ChorusAction
{
    protected function handle(Request $request, ActionCollector $actions): void
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        $data = $request->all();

        // Create the message using the action collector (UUID auto-generated on client)
        $actions->messages->create([
            'id' => $data['id'], // UUID provided by client
            'body' => $data['body'],
            'platform_id' => $data['platform_id'],
            'user_id' => $user->id,
            'tenant_id' => $user->tenant_id,
        ]);

        // Update the user's last activity timestamp
        $actions->users->update([
            'id' => $user->id,
            'last_activity_at' => now(),
        ]);

        // Optionally update platform metrics
        $actions->platforms->update([
            'id' => $data['platformId'],
            'last_message_at' => now(),
            'message_count' => \DB::raw('message_count + 1'),
        ]);
    }

    public function rules(): array
    {
        return [
            'messages.create' => [
                'id' => 'nullable|string|uuid',
                'body' => 'required|string|max:1000',
                'platform_id' => 'required|string|uuid|exists:platforms,id',
                'user_id' => 'required|string|uuid|exists:users,id',
                'tenant_id' => 'required|string|uuid',
            ],
            'users.update' => [
                'id' => 'required|string|uuid|exists:users,id',
                'last_activity_at' => 'required|date',
            ],
            'platforms.update' => [
                'id' => 'required|string|uuid|exists:platforms,id',
                'last_message_at' => 'nullable|date',
                'message_count' => 'nullable|numeric|min:0',
            ],
        ];
    }

}
