<?php

namespace App\Actions\ChorusActions;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Pixelsprout\LaravelChorus\Support\ChorusAction;

final class CreateUserAction extends ChorusAction
{
    public function rules(): array
    {
        return [
            'users.create' => [
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:8',
            ],
        ];
    }

    public function handle(Request $request): void
    {
        $user = auth()->user();

        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        // Get user create operations
        $userCreateOperations = $this->getOperations('users', 'create');

        if (empty($userCreateOperations)) {
            throw new \Exception('No user data found in request');
        }

        foreach ($userCreateOperations as $userData) {
            User::create([
                'id' => $userData['id'] ?? Str::uuid(),
                'name' => $userData['name'],
                'email' => $userData['email'],
                'password' => Hash::make($userData['password']),
                'email_verified_at' => now(),
            ]);
        }
    }
}