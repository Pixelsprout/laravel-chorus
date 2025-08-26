<?php

namespace App\Actions\ChorusActions;

use Illuminate\Http\Request;
use Pixelsprout\LaravelChorus\Support\ActionCollector;
use Pixelsprout\LaravelChorus\Support\ChorusAction;
use Illuminate\Support\Str;

final class SimpleCreateMessageAction extends ChorusAction
{
    // Single operation - enables shorthand format
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
        ];
    }

    public function handle(Request $request): void
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        $data = $request->all();

        // Create the message using the action collector (UUID auto-generated on client)
        $actions->messages->create(function ($messageData) use ($user) {
            return [
                'id' => $messageData->id,
                'body' => $messageData->body,
                'platform_id' => $messageData->platform_id,
                'user_id' => $user->id,
                'tenant_id' => $user->tenant_id,
            ];
        });
    }
}
