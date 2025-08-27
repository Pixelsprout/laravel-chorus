<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\StringType;
use Spatie\LaravelData\Attributes\Validation\Uuid;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Exists;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class CreateMessageData extends Data
{
    public function __construct(
        #[Uuid]
        public ?string $id,
        
        #[Required, StringType, Max(1000)]
        public string $body,
        
        #[Required, StringType, Uuid, Exists('platforms', 'id')]
        public string $platform_id,
        
        #[Required, StringType, Uuid, Exists('users', 'id')]
        public string $user_id,
        
        #[Required]
        public int $tenant_id,
    ) {}
}