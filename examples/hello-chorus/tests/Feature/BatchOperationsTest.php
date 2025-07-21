<?php

use App\Models\Message;
use App\Models\Platform;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create test data
    $this->tenant = Tenant::factory()->create();
    $this->user = User::factory()->create(['tenant_id' => $this->tenant->id]);
    $this->platform = Platform::factory()->create();
    
    // Associate user with platform
    $this->user->platforms()->attach($this->platform->id);
});

test('batch messages endpoint processes multiple message creations', function () {
    $operations = [
        [
            'method' => 'POST',
            'url' => '/messages',
            'body' => [
                'message' => 'First test message',
                'platformId' => $this->platform->id,
            ]
        ],
        [
            'method' => 'POST',
            'url' => '/messages',
            'body' => [
                'message' => 'Second test message',
                'platformId' => $this->platform->id,
            ]
        ],
        [
            'method' => 'POST',
            'url' => '/messages',
            'body' => [
                'message' => 'Third test message',
                'platformId' => $this->platform->id,
            ]
        ]
    ];

    $response = $this->actingAs($this->user)
        ->postJson('/batch/messages', [
            'operations' => $operations
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'summary' => [
                'total' => 3,
                'successful' => 3,
                'failed' => 0
            ]
        ]);

    // Verify messages were created
    expect(Message::count())->toBe(3);
    expect(Message::where('body', 'First test message')->exists())->toBeTrue();
    expect(Message::where('body', 'Second test message')->exists())->toBeTrue();
    expect(Message::where('body', 'Third test message')->exists())->toBeTrue();
});

test('bulk create messages action processes multiple messages', function () {
    $messages = [
        [
            'message' => 'Bulk message 1',
            'platformId' => $this->platform->id,
        ],
        [
            'message' => 'Bulk message 2',
            'platformId' => $this->platform->id,
        ],
        [
            'message' => 'Bulk message 3',
            'platformId' => $this->platform->id,
        ]
    ];

    $response = $this->actingAs($this->user)
        ->postJson('/messages/bulk', [
            'messages' => $messages
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'data' => [
                'summary' => [
                    'total' => 3,
                    'successful' => 3,
                    'failed' => 0
                ]
            ]
        ]);

    // Verify messages were created
    expect(Message::count())->toBe(3);
    expect(Message::where('body', 'Bulk message 1')->exists())->toBeTrue();
    expect(Message::where('body', 'Bulk message 2')->exists())->toBeTrue();
    expect(Message::where('body', 'Bulk message 3')->exists())->toBeTrue();
});

test('batch operations handle validation errors gracefully', function () {
    $operations = [
        [
            'method' => 'POST',
            'url' => '/messages',
            'body' => [
                'message' => 'Valid message',
                'platformId' => $this->platform->id,
            ]
        ],
        [
            'method' => 'POST',
            'url' => '/messages',
            'body' => [
                // Missing required 'message' field
                'platformId' => $this->platform->id,
            ]
        ],
        [
            'method' => 'POST',
            'url' => '/messages',
            'body' => [
                'message' => 'Another valid message',
                'platformId' => $this->platform->id,
            ]
        ]
    ];

    $response = $this->actingAs($this->user)
        ->postJson('/batch/messages', [
            'operations' => $operations
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => false, // Not all operations succeeded
            'summary' => [
                'total' => 3,
                'successful' => 2,
                'failed' => 1
            ]
        ]);

    // Verify only valid messages were created
    expect(Message::count())->toBe(2);
    expect(Message::where('body', 'Valid message')->exists())->toBeTrue();
    expect(Message::where('body', 'Another valid message')->exists())->toBeTrue();
});

test('unauthorized users cannot access batch endpoints', function () {
    $operations = [
        [
            'method' => 'POST',
            'url' => '/messages',
            'body' => [
                'message' => 'Test message',
                'platformId' => $this->platform->id,
            ]
        ]
    ];

    $response = $this->postJson('/batch/messages', [
        'operations' => $operations
    ]);

    $response->assertStatus(401);
    expect(Message::count())->toBe(0);
});