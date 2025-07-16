<?php

namespace Database\Seeders;

use App\Models\Message;
use App\Models\Platform;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PlatformUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $smsPlatform = Platform::firstOrCreate(['name' => 'SMS']);
        $emailPlatform = Platform::firstOrCreate(['name' => 'Email']);
        $slackPlatform = Platform::firstOrCreate(['name' => 'Slack']);
        $webPlatform = Platform::firstOrCreate(['name' => 'Web']);

        $tenants = [
            // tenant 1
             [
                'user1' => [
                   'platforms' => [$smsPlatform, $emailPlatform],
                    'messages' => [
                        ['body' => 'This is a test email message', 'platform' => $emailPlatform->id],
                        ['body' => 'Please read my text message!', 'platform' => $smsPlatform->id],
                    ],
                ],
                'user2' => [
                   'platforms' => [$webPlatform, $emailPlatform, $slackPlatform],
                    'messages' => [
                        ['body' => 'This email is really important 📧', 'platform' => $emailPlatform->id],
                        ['body' => 'Please review my pr...', 'platform' => $slackPlatform->id],
                    ],
                ]
            ],
            // tenant 2
            [
                'user3' => [
                    'platforms' => [$smsPlatform, $emailPlatform],
                    'messages' => [
                        ['body' => 'This is a test email message', 'platform' => $emailPlatform->id],
                        ['body' => 'Please read my text message!', 'platform' => $smsPlatform->id],
                    ],
                ],
                'user4' => [
                    'platforms' => [$webPlatform, $emailPlatform, $slackPlatform],
                    'messages' => [
                        ['body' => 'This email is really important 📧', 'platform' => $emailPlatform->id],
                        ['body' => 'Please review my pr...', 'platform' => $slackPlatform->id],
                    ],
                ]
            ]
        ];

        foreach ($tenants as $tenantUsers) {
            $tenant = Tenant::factory()->create();

            foreach ($tenantUsers as $tenantUserKey => $tenantUser) {
                $user = User::firstOrCreate([
                    'email' => "$tenantUserKey@example.com",
                ], [
                    'name' => $tenantUserKey,
                    'password' => Hash::make('password'),
                    'tenant_id' => $tenant->id,
                ]);

                // Sync with platforms
                foreach ($tenantUser['platforms'] as $platform) {
                    $user->platforms()->syncWithoutDetaching($platform->id);
                }

                // Create messages
                foreach ($tenantUser['messages'] as $message) {
                    Message::create(
                        [
                            'user_id' => $user->id,
                            'platform_id' => $message['platform'],
                            'tenant_id' => $user->tenant_id,
                            'body' => $message['body'],
                        ],
                    );
                }

            }
        }
    }
}
