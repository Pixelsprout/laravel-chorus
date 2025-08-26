<?php

namespace App\Actions\ChorusActions;

use Illuminate\Http\Request;
use Pixelsprout\LaravelChorus\Support\ChorusAction;

final class CreateMessageWithActivityActionSimplified extends ChorusAction
{
    public function handle(Request $request): void
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        // This is just a placeholder - we'll update this with DTOs
        // For now, just add basic functionality to make it compile
        // TODO: Update with DTO implementation
    }

    public function rules(): array
    {
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