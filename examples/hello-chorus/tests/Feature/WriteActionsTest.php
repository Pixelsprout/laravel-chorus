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

test('can get available actions for messages table', function () {
    $response = $this->actingAs($this->user)
        ->getJson('/api/actions/messages');

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'table' => 'messages',
        ])
        ->assertJsonStructure([
            'success',
            'table',
            'actions' => [
                'create' => [
                    'name',
                    'config',
                    'rules',
                    'allowsOfflineWrites',
                    'supportsBatch',
                ],
                'update' => [
                    'name',
                    'config', 
                    'rules',
                    'allowsOfflineWrites',
                    'supportsBatch',
                ],
                'delete' => [
                    'name',
                    'config',
                    'rules', 
                    'allowsOfflineWrites',
                    'supportsBatch',
                ],
            ],
        ]);

    $data = $response->json();
    expect($data['actions']['create']['allowsOfflineWrites'])->toBeTrue();
    expect($data['actions']['create']['supportsBatch'])->toBeTrue();
});

test('can execute create message action', function () {
    $messageData = [
        'message' => 'Test message via write action',
        'platformId' => $this->platform->id,
    ];

    $response = $this->actingAs($this->user)
        ->postJson('/api/write/messages/create', $messageData);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'action' => 'create',
            'table' => 'messages',
        ]);

    expect(Message::where('body', 'Test message via write action')->exists())->toBeTrue();
});

test('can execute batch create message action', function () {
    $items = [
        [
            'message' => 'Batch message 1',
            'platformId' => $this->platform->id,
        ],
        [
            'message' => 'Batch message 2', 
            'platformId' => $this->platform->id,
        ],
        [
            'message' => 'Batch message 3',
            'platformId' => $this->platform->id,
        ],
    ];

    $response = $this->actingAs($this->user)
        ->postJson('/api/write/messages/create', ['items' => $items]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'action' => 'create',
            'table' => 'messages',
            'data' => [
                'summary' => [
                    'total' => 3,
                    'successful' => 3,
                    'failed' => 0,
                ],
            ],
        ]);

    expect(Message::count())->toBe(3);
    expect(Message::where('body', 'Batch message 1')->exists())->toBeTrue();
    expect(Message::where('body', 'Batch message 2')->exists())->toBeTrue();
    expect(Message::where('body', 'Batch message 3')->exists())->toBeTrue();
});

test('can execute update message action', function () {
    $message = Message::factory()->create([
        'body' => 'Original message',
        'user_id' => $this->user->id,
        'tenant_id' => $this->tenant->id,
        'platform_id' => $this->platform->id,
    ]);

    $updateData = [
        'id' => $message->id,
        'message' => 'Updated message via write action',
    ];

    $response = $this->actingAs($this->user)
        ->postJson('/api/write/messages/update', $updateData);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'action' => 'update',
            'table' => 'messages',
        ]);

    $message->refresh();
    expect($message->body)->toBe('Updated message via write action');
});

test('can execute delete message action', function () {
    $message = Message::factory()->create([
        'user_id' => $this->user->id,
        'tenant_id' => $this->tenant->id,
        'platform_id' => $this->platform->id,
    ]);

    $deleteData = [
        'id' => $message->id,
    ];

    $response = $this->actingAs($this->user)
        ->postJson('/api/write/messages/delete', $deleteData);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'action' => 'delete',
            'table' => 'messages',
        ]);

    expect(Message::find($message->id))->toBeNull();
});

test('write actions handle validation errors', function () {
    $invalidData = [
        'message' => '', // Required field is empty
        'platformId' => 'invalid-uuid',
    ];

    $response = $this->actingAs($this->user)
        ->postJson('/api/write/messages/create', $invalidData);

    $response->assertStatus(422)
        ->assertJson([
            'success' => false,
            'error' => 'Validation failed',
        ])
        ->assertJsonStructure([
            'validation_errors',
        ]);

    expect(Message::count())->toBe(0);
});

test('write actions require authentication', function () {
    $messageData = [
        'message' => 'Test message',
        'platformId' => $this->platform->id,
    ];

    $response = $this->postJson('/api/write/messages/create', $messageData);

    $response->assertStatus(401);
    expect(Message::count())->toBe(0);
});

test('batch actions handle partial failures gracefully', function () {
    $items = [
        [
            'message' => 'Valid message 1',
            'platformId' => $this->platform->id,
        ],
        [
            'message' => '', // Invalid - empty message
            'platformId' => $this->platform->id,
        ],
        [
            'message' => 'Valid message 2',
            'platformId' => $this->platform->id,
        ],
    ];

    $response = $this->actingAs($this->user)
        ->postJson('/api/write/messages/create', ['items' => $items]);

    $response->assertStatus(207) // Multi-Status for partial success
        ->assertJson([
            'success' => false, // Not all succeeded
            'action' => 'create',
            'table' => 'messages',
            'data' => [
                'summary' => [
                    'total' => 3,
                    'successful' => 2,
                    'failed' => 1,
                ],
            ],
        ]);

    expect(Message::count())->toBe(2);
    expect(Message::where('body', 'Valid message 1')->exists())->toBeTrue();
    expect(Message::where('body', 'Valid message 2')->exists())->toBeTrue();
});