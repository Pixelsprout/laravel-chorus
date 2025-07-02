<?php

namespace Database\Seeders;

use App\Models\Platform;
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
        $user = User::firstOrCreate([
            'email' => 'user1@example.com',
        ], [
            'name' => 'Test User',
            'password' => Hash::make('password'),
        ]);

        $smsPlatform = Platform::firstOrCreate(['name' => 'SMS']);
        $emailPlatform = Platform::firstOrCreate(['name' => 'Email']);

        $user->platforms()->syncWithoutDetaching([$smsPlatform->id, $emailPlatform->id]);
    }
}