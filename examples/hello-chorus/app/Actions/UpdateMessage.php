<?php

namespace App\Actions;

use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;
use Pixelsprout\LaravelChorus\Models\Harmonic;

class UpdateMessage
{
    use AsAction;

    public function handle(Request $request, string $messageId)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:255',
            'platformId' => 'required|string|uuid|exists:platforms,id',
        ]);

        if ($validator->fails()) {
            // Create a rejected harmonic for the validation failure
            Harmonic::createValidationRejected(
                'update',
                array_merge($request->all(), ['id' => $messageId]),
                $validator->errors()->first(),
                auth()->id(),
                $messageId
            );

            // Throw validation exception for Inertia to handle
            throw new ValidationException($validator);
        }

        $validated = $validator->validated();
        $user = auth()->user();

        // Find the message and check ownership
        $message = Message::where('id', $messageId)
            ->where('user_id', $user->id)
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (!$message) {
            // Create a rejected harmonic for permission failure
            Harmonic::createPermissionRejected(
                'update',
                array_merge($request->all(), ['id' => $messageId]),
                auth()->id(),
                $messageId
            );

            abort(403, 'You can only update your own messages.');
        }

        // Update the message
        $message->update([
            'body' => $validated['message'],
            'platform_id' => $validated['platformId'],
        ]);
    }
}