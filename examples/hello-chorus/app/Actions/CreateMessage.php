<?php

namespace App\Actions;

use App\Models\Message;
use Illuminate\Http\Request;
use Lorisleiva\Actions\Concerns\AsAction;

class CreateMessage
{
    use AsAction;

    public function handle(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:255',
            'platformId' => 'required|string|uuid|exists:platforms,id',
            'id' => 'string|uuid',
        ]);

        $user = auth()->user();

        // Create the message
        Message::create([
            'id' => $validated['id'] ?? null, // User defined uuid
            'body' => $validated['message'],
            'platform_id' => $validated['platformId'],
            'user_id' => $user->id,
            'tenant_id' => $user->tenant_id,
        ]);
    }
}
