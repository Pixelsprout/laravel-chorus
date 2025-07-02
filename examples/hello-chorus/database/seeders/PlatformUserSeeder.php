<?php

namespace Database\Seeders;

use App\Models\Platform;
use App\Models\User;
use App\Models\Message;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PlatformUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user1 = User::firstOrCreate([
            'email' => 'user1@example.com',
        ], [
            'name' => 'Test User',
            'password' => Hash::make('password'),
        ]);

        $smsPlatform = Platform::firstOrCreate(['name' => 'SMS']);
        $emailPlatform = Platform::firstOrCreate(['name' => 'Email']);
        $slackPlatform = Platform::firstOrCreate(['name' => 'Slack']);
        $webPlatform = Platform::firstOrCreate(['name' => 'Web']);

        $user1->platforms()->syncWithoutDetaching([$smsPlatform->id, $emailPlatform->id]);

        $user2 = User::firstOrCreate([
            'email' => 'user2@example.com',
        ], [
            'name' => 'Test User 2',
            'password' => Hash::make('password'),
        ]);

        $user2->platforms()->syncWithoutDetaching([$slackPlatform->id, $webPlatform->id]);

        // Create some messages per platform
        $messages = [
            [
                'user_id' => $user1->id,
                'platform_id' => $smsPlatform->id,
                'body' => 'This is a SMS message',
            ],
            [
                'user_id' => $user1->id,
                'platform_id' => $emailPlatform->id,
                'body' => 'Please respond to this email.',
            ],
            [
                'user_id' => $user2->id,
                'platform_id' => $slackPlatform->id,
                'body' => 'Do you have any questions about this library?',
            ],
            [
                'user_id' => $user2->id,
                'platform_id' => $webPlatform->id,
                'body' => 'Whohoo, we are on the web!',
            ],
        ];

        foreach ($messages as $message) {
            Message::create($message);
        }

    }
}
