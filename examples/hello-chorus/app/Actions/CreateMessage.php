<?php

namespace App\Actions;

use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;
use Pixelsprout\LaravelChorus\Models\Harmonic;

class CreateMessage
{
    use AsAction;

    public function handle(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:255',
            'platformId' => 'required|string|uuid|exists:platforms,id',
            'id' => 'string|uuid',
        ]);

        if ($validator->fails()) {
            // Create a rejected harmonic for the validation failure
            Harmonic::createValidationRejected(
                'create',
                $request->all(),
                $validator->errors()->first(),
                auth()->id(),
                // it's helpful if the id exists as we can then know what event failed on the client-side
                $request->input('id') ?? Str::uuid()
            );

            // Throw validation exception for Inertia to handle
            throw new ValidationException($validator);
        }

        $validated = $validator->validated();

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
