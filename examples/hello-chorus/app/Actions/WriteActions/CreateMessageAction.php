<?php

namespace App\Actions\WriteActions;

use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Pixelsprout\LaravelChorus\Support\WriteAction;

class CreateMessageAction extends WriteAction
{
    protected array $config = [
        'allowOfflineWrites' => true,
        'supportsBatch' => true,
    ];

    public function handle(Request $request, array $data): Message
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        // Create the message
        $message = Message::create([
            'id' => $data['id'] ?? null,
            'body' => $data['message'],
            'platform_id' => $data['platformId'],
            'user_id' => $user->id,
            'tenant_id' => $user->tenant_id,
        ]);

        return $message;
    }

    public function rules(): array
    {
        return [
            'message' => 'required|string|max:255',
            'platformId' => 'required|string|uuid|exists:platforms,id',
            'id' => 'nullable|string|uuid',
        ];
    }
}
