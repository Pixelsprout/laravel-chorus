<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Data\CreateMessageData;
use App\Data\UpdateUserData;
use App\Data\UpdatePlatformData;
use App\Data\CreateMessageWithActivityActionData;

class DTOTest extends TestCase
{
    #[\PHPUnit\Framework\Attributes\Test]
    public function it_can_create_message_dto_from_array()
    {
        $data = [
            'id' => '123e4567-e89b-12d3-a456-426614174000',
            'body' => 'Test message',
            'platform_id' => '987e6543-e21a-12d3-a456-426614174000',
            'user_id' => '456e7890-e12b-34c5-a789-426614174000',
            'tenant_id' => 1,
        ];

        $dto = CreateMessageData::from($data);

        $this->assertEquals('123e4567-e89b-12d3-a456-426614174000', $dto->id);
        $this->assertEquals('Test message', $dto->body);
        $this->assertEquals('987e6543-e21a-12d3-a456-426614174000', $dto->platform_id);
        $this->assertEquals('456e7890-e12b-34c5-a789-426614174000', $dto->user_id);
        $this->assertEquals(1, $dto->tenant_id);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_can_create_main_action_dto_from_request_structure()
    {
        $requestData = [
            'operations' => [
                'messages.create' => [[
                    'id' => '123e4567-e89b-12d3-a456-426614174000',
                    'body' => 'Test message',
                    'platform_id' => '987e6543-e21a-12d3-a456-426614174000',
                    'user_id' => '456e7890-e12b-34c5-a789-426614174000',
                    'tenant_id' => 1,
                ]],
                'users.update' => [[
                    'id' => '456e7890-e12b-34c5-a789-426614174000',
                    'last_activity_at' => '2024-01-01T00:00:00Z',
                ]],
                'platforms.update' => [[
                    'id' => '987e6543-e21a-12d3-a456-426614174000',
                    'last_message_at' => '2024-01-01T00:00:00Z',
                ]],
            ],
            'data' => [
                'test_item' => 'test message',
            ],
        ];

        $actionData = CreateMessageWithActivityActionData::fromRequest($requestData);

        $this->assertTrue($actionData->hasCreateMessage());
        $this->assertTrue($actionData->hasUpdateUser());
        $this->assertTrue($actionData->hasUpdatePlatform());

        $this->assertEquals('Test message', $actionData->createMessage->body);
        $this->assertEquals('456e7890-e12b-34c5-a789-426614174000', $actionData->updateUser->id);
        $this->assertEquals('987e6543-e21a-12d3-a456-426614174000', $actionData->updatePlatform->id);
        $this->assertEquals('test message', $actionData->getAdditionalDataValue('test_item'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_handles_missing_operations_gracefully()
    {
        $requestData = [
            'operations' => [
                'messages.create' => [[
                    'id' => '123e4567-e89b-12d3-a456-426614174000',
                    'body' => 'Test message',
                    'platform_id' => '987e6543-e21a-12d3-a456-426614174000',
                    'user_id' => '456e7890-e12b-34c5-a789-426614174000',
                    'tenant_id' => 1,
                ]],
                // Missing users.update and platforms.update
            ],
            'data' => [],
        ];

        $actionData = CreateMessageWithActivityActionData::fromRequest($requestData);

        $this->assertTrue($actionData->hasCreateMessage());
        $this->assertFalse($actionData->hasUpdateUser());
        $this->assertFalse($actionData->hasUpdatePlatform());
        $this->assertNull($actionData->updateUser);
        $this->assertNull($actionData->updatePlatform);
    }
}