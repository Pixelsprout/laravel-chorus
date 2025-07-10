<?php

namespace Database\Factories;

use App\Models\Message;
use App\Models\Platform;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Message>
 */
class MessageFactory extends Factory
{
    protected $model = Message::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'body' => $this->faker->sentence,
            'user_id' => User::factory(),
            'platform_id' => Platform::factory(),
            'tenant_id' => Tenant::factory(),
        ];
    }
}