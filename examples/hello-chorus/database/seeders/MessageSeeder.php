<?php

namespace Database\Seeders;

use App\Models\Message;
use App\Models\Platform;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MessageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::first();

        if (!$user) {
            return;
        }

        $platforms = Platform::all();

        if ($platforms->isEmpty()) {
            return;
        }

        $messages = [
            [
                'body' => 'Welcome to Laravel Chorus!',
                'platform_id' => $platforms->where('name', 'Web Chat')->first()->id ?? $platforms->first()->id,
            ],
            [
                'body' => 'This is a message synced in real-time.',
                'platform_id' => $platforms->where('name', 'Email')->first()->id ?? $platforms->first()->id,
            ],
            [
                'body' => 'Try adding new messages to see them sync.',
                'platform_id' => $platforms->where('name', 'SMS')->first()->id ?? $platforms->first()->id,
            ],
            [
                'body' => 'Messages are stored in IndexedDB on your device.',
                'platform_id' => $platforms->where('name', 'Mobile App')->first()->id ?? $platforms->first()->id,
            ],
        ];

        foreach ($messages as $message) {
            Message::create([
                'id' => Str::uuid(),
                'body' => $message['body'],
                'user_id' => $user->id,
                'platform_id' => $message['platform_id'],
            ]);
        }
    }
}
