<?php

namespace App\Http\Harmonics;

use App\Models\Message;
use Pixelsprout\LaravelChorus\Http\Harmonic;

class MessageHarmonic extends Harmonic
{
    public function toSync(): Message
    {
        return Message::select(
            ['id', 'body', 'timestamp', 'user_id', 'platform_id']
        );
    }
}
