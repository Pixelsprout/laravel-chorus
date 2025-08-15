<?php

namespace App\Actions\ChorusActions;

use Illuminate\Http\Request;
use Pixelsprout\LaravelChorus\Support\ActionCollector;
use Pixelsprout\LaravelChorus\Support\ChorusAction;
use Illuminate\Support\Str;

final class CreateMessageWithActivityAction extends ChorusAction {
    protected function handle(Request $request, ActionCollector $actions): void {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        // Create the message using the new closure-based API
        $actions->messages->create(fn($messageData) => [
            'id' => $messageData->id,
            'body' => $messageData->body,
            'platform_id' => $messageData->platform_id,
            'user_id' => $user->id,
            'tenant_id' => $user->tenant_id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Update the user's last activity timestamp
        $actions->users->update([
            'id' => $user->id,
            'last_activity_at' => now(),
        ]);

        // Update platform metrics
        $actions->platforms->update(fn($platformData) => [
            'id' => $platformData->id,
            'last_message_at' => now(),
        ]);
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
        ];
    }
}
