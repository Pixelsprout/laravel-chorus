<?php

namespace Database\Seeders;

use App\Models\Platform;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PlatformSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $platforms = [
            ['name' => 'Email'],
            ['name' => 'SMS'],
            ['name' => 'Web Chat'],
            ['name' => 'Mobile App'],
        ];

        foreach ($platforms as $platform) {
            Platform::create($platform);
        }
    }
}
