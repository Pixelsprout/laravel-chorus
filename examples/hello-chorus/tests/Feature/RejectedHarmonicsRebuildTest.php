<?php

use App\Models\Message;
use App\Models\User;
use App\Models\Platform;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('rejected harmonics are not triggered during database rebuild', function () {
    // Create a user with tenant and platform for authentication
    $tenant = Tenant::factory()->create();
    $platform = Platform::factory()->create();
    $user = User::factory()->create(['tenant_id' => $tenant->id]);
    $user->platforms()->attach($platform->id);
    
    // Authenticate the user
    $this->actingAs($user);
    
    // Create some test messages
    $messages = Message::factory()->count(3)->create([
        'tenant_id' => $tenant->id,
        'platform_id' => $platform->id,
        'user_id' => $user->id,
    ]);
    
    // Get initial schema to establish baseline
    $initialSchemaResponse = $this->getJson('/api/schema');
    $initialSchemaResponse->assertOk();
    
    $initialSchema = $initialSchemaResponse->json();
    expect($initialSchema)->toHaveKey('database_version');
    
    // Simulate initial sync
    $syncResponse = $this->getJson('/api/sync/messages?initial=true');
    $syncResponse->assertOk();
    
    $syncData = $syncResponse->json();
    expect($syncData['records'])->toHaveCount(3);
    expect($syncData)->toHaveKey('latest_harmonic_id');
    
    // The key test: verify that harmonics after initial sync don't include
    // any rejected harmonics for existing records
    $latestHarmonicId = $syncData['latest_harmonic_id'];
    
    if ($latestHarmonicId) {
        $harmonicsResponse = $this->getJson("/api/sync/messages?after={$latestHarmonicId}");
        $harmonicsResponse->assertOk();
        
        $harmonicsData = $harmonicsResponse->json();
        
        // Should have no harmonics since no changes were made after initial sync
        expect($harmonicsData['harmonics'])->toBeEmpty();
        
        // Verify no rejected harmonics are present
        foreach ($harmonicsData['harmonics'] as $harmonic) {
            expect($harmonic)->not->toHaveKey('rejected');
            expect($harmonic['rejected'] ?? false)->toBeFalse();
        }
    }
    
    // Create a new message to generate a legitimate harmonic
    $newMessage = Message::factory()->create([
        'tenant_id' => $tenant->id,
        'platform_id' => $platform->id,
        'user_id' => $user->id,
    ]);
    
    // Get new harmonics - should only contain the new message, no rejected ones
    $newHarmonicsResponse = $this->getJson("/api/sync/messages?after={$latestHarmonicId}");
    $newHarmonicsResponse->assertOk();
    
    $newHarmonicsData = $newHarmonicsResponse->json();
    
    // Should have exactly one harmonic for the new message
    expect($newHarmonicsData['harmonics'])->toHaveCount(1);
    
    $harmonic = $newHarmonicsData['harmonics'][0];
    expect($harmonic['record_id'])->toBe($newMessage->id);
    expect($harmonic['operation'])->toBe('create');
    expect($harmonic['rejected'] ?? false)->toBeFalse();
    expect($harmonic)->toHaveKey('id');
    expect($harmonic)->toHaveKey('data');
});

test('schema endpoint returns consistent data structure', function () {
    $response = $this->getJson('/api/schema');
    $response->assertOk();
    
    $data = $response->json();
    
    // Verify all required fields are present
    expect($data)->toHaveKeys(['schema', 'database_version', 'schema_version', 'generated_at']);
    
    // Verify data types
    expect($data['schema'])->toBeArray();
    expect($data['database_version'])->toBeString();
    expect($data['schema_version'])->toBeInt();
    expect($data['generated_at'])->toBeString();
    
    // Verify schema contains expected tables
    expect($data['schema'])->toHaveKey('messages');
    expect($data['schema']['messages'])->toBeString();
    
    // Verify database version format
    expect($data['database_version'])->toMatch('/^\d+_\d+$/');
});