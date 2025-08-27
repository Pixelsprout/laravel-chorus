<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class CreateMessageWithActivityActionData extends Data
{
    public function __construct(
        public ?CreateMessageData $createMessage,
        public ?UpdateUserData $updateUser,
        public ?UpdatePlatformData $updatePlatform,
        public array $additionalData = [],
    ) {}

    /**
     * Create from the organized request structure
     */
    public static function fromRequest(array $requestData): self
    {
        $operations = $requestData['operations'] ?? [];
        $data = $requestData['data'] ?? [];

        // Extract create message data
        $createMessage = null;
        if (isset($operations['messages.create'][0])) {
            $createMessage = CreateMessageData::from($operations['messages.create'][0]);
        }

        // Extract update user data  
        $updateUser = null;
        if (isset($operations['users.update'][0])) {
            $updateUser = UpdateUserData::from($operations['users.update'][0]);
        }

        // Extract update platform data
        $updatePlatform = null;
        if (isset($operations['platforms.update'][0])) {
            $updatePlatform = UpdatePlatformData::from($operations['platforms.update'][0]);
        }

        return new self(
            createMessage: $createMessage,
            updateUser: $updateUser,
            updatePlatform: $updatePlatform,
            additionalData: $data,
        );
    }

    /**
     * Check if create message data is available
     */
    public function hasCreateMessage(): bool
    {
        return $this->createMessage !== null;
    }

    /**
     * Check if update user data is available
     */
    public function hasUpdateUser(): bool
    {
        return $this->updateUser !== null;
    }

    /**
     * Check if update platform data is available
     */
    public function hasUpdatePlatform(): bool
    {
        return $this->updatePlatform !== null;
    }

    /**
     * Get additional data value with default
     */
    public function getAdditionalDataValue(string $key, mixed $default = null): mixed
    {
        return $this->additionalData[$key] ?? $default;
    }
}