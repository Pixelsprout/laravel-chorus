<?php

namespace App\Actions\ChorusActions;

use Illuminate\Http\Request;
use Pixelsprout\LaravelChorus\Support\ActionCollector;
use Pixelsprout\LaravelChorus\Support\ChorusAction;
use Illuminate\Support\Str;

final class CreateMessageWithActivityAction extends ChorusAction
{
    protected array $config = [
        'allowOfflineWrites' => true,
        'supportsBatch' => true,
    ];

    public function rules(): array
    {
        return [
            'message' => 'required|string|max:255',
            'platformId' => 'required|string|uuid|exists:platforms,id',
            'id' => 'nullable|string|uuid',
        ];
    }

    protected function execute(Request $request, ActionCollector $actions): void
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        $data = $request->all();

        // Create the message using the action collector
        $actions->messages->create([
            'id' => $data['id'] ?? Str::uuid(),
            'body' => $data['message'],
            'platform_id' => $data['platformId'],
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
}