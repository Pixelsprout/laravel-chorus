<?php

namespace App\Actions;

use App\Models\Message;
use Illuminate\Http\Request;
use Lorisleiva\Actions\Concerns\AsAction;
use Pixelsprout\LaravelChorus\Models\Harmonic;

class DeleteMessage
{
    use AsAction;

    public function handle(Request $request, string $messageId)
    {
        $user = auth()->user();

        // Find the message and check ownership
        $message = Message::where('id', $messageId)
            ->where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (!$message) {
            // Create a rejected harmonic for permission failure
            Harmonic::createPermissionRejected(
                'delete',
                ['id' => $messageId],
                auth()->id(),
                $messageId
            );

            abort(403, 'You can only delete your own messages.');
        }

        // Delete the message
        $message->delete();
    }
}