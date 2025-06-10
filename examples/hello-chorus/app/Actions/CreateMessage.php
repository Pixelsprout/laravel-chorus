<?php

namespace App\Actions;

use App\Models\Message;
use App\Models\Platform;
use Illuminate\Support\Str;

class CreateMessage
{
    /**
     * Create a new message.
     *
     * @param array $data
     * @param string $userId
     * @return Message
     */
    public function execute(array $data, $userId): Message
    {
        // Create the message
        $message = Message::create([
            'id' => Str::uuid(),
            'body' => $data['body'],
            'platform_id' => $data['platform_id'],
            'user_id' => $userId,
        ]);
        
        // Make sure the platform is properly synced
        $platform = Platform::find($data['platform_id']);
        if ($platform) {
            // Touch the platform to ensure it's synced
            $platform->touch();
        }
        
        return $message->fresh();
    }
}