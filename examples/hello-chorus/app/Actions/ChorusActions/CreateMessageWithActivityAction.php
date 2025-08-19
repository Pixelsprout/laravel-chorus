<?php

namespace App\Actions\ChorusActions;

use App\Data\CreateMessageWithActivityActionData;
use App\Models\Message;
use App\Models\User;
use App\Models\Platform;
use Illuminate\Http\Request;
use Pixelsprout\LaravelChorus\Support\ChorusAction;

final class CreateMessageWithActivityAction extends ChorusAction
{
    public function handle(Request $request): void
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        $actionData = CreateMessageWithActivityActionData::fromRequest($request->all());

        // Log any additional data sent from the client
        if (!empty($actionData->additionalData)) {
            \Log::info('Received additional data from client:', $actionData->additionalData);
        }

        // Create the message using typed DTO data
        if ($actionData->hasCreateMessage()) {
            $messageData = $actionData->createMessage;
            Message::create([
                'id' => $messageData->id,
                'body' => $messageData->body,
                'platform_id' => $messageData->platform_id,
                'user_id' => $user->id,
                'tenant_id' => $user->tenant_id,
            ]);
        }

        // Update user's last activity using typed DTO data
        if ($actionData->hasUpdateUser()) {
            User::where('id', $user->id)->update([
                'last_activity_at' => now(),
            ]);
        }

        // Update platform metrics using typed DTO data
        if ($actionData->hasUpdatePlatform()) {
            $platformData = $actionData->updatePlatform;
            Platform::where('id', $platformData->id)->update([
                'last_message_at' => now(),
            ]);
        }
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
            'data' => [
                'test_item' => 'required|string',
            ],
        ];
    }
}
