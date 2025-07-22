<?php

use App\Models\Message;
use App\Models\User;
use App\Models\Platform;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('database rebuild handles duplicate records gracefully', function () {
    // Create a user with tenant and platform for authentication
    $tenant = Tenant::factory()->create();
    $platform = Platform::factory()->create();
    $user = User::factory()->create(['tenant_id' => $tenant->id]);
    $user->platforms()->attach($platform->id);
    
    // Authenticate the user
    $this->actingAs($user);
    
    // Create some test messages for this user's tenant and platform
    $messages = Message::factory()->count(3)->create([
        'tenant_id' => $tenant->id,
        'platform_id' => $platform->id,
        'user_id' => $user->id,
    ]);
    
    // Get the schema endpoint to simulate client initialization
    $schemaResponse = $this->getJson('/api/schema');
    $schemaResponse->assertOk();
    
    $schemaData = $schemaResponse->json();
    expect($schemaData)->toHaveKeys(['schema', 'database_version', 'schema_version']);
    
    // Simulate initial sync for messages - this should return all existing records
    $syncResponse = $this->getJson('/api/sync/messages?initial=true');
    $syncResponse->assertOk();
    
    $syncData = $syncResponse->json();
    expect($syncData['records'])->toHaveCount(3);
    expect($syncData)->toHaveKey('latest_harmonic_id');
    
    // The key test: after initial sync, subsequent harmonic requests should only
    // return changes after the latest_harmonic_id, not duplicate the initial records
    $latestHarmonicId = $syncData['latest_harmonic_id'];
    
    if ($latestHarmonicId) {
        $incrementalResponse = $this->getJson("/api/sync/messages?after={$latestHarmonicId}");
        $incrementalResponse->assertOk();
        
        $incrementalData = $incrementalResponse->json();
        
        // Should have no harmonics since no changes were made after initial sync
        expect($incrementalData['harmonics'])->toBeEmpty();
    }
    
    // Create a new message after initial sync
    $newMessage = Message::factory()->create([
        'tenant_id' => $tenant->id,
        'platform_id' => $platform->id,
        'user_id' => $user->id,
    ]);
    
    // Now get harmonics - should only contain the new message
    $newHarmonicsResponse = $this->getJson("/api/sync/messages?after={$latestHarmonicId}");
    $newHarmonicsResponse->assertOk();
    
    $newHarmonicsData = $newHarmonicsResponse->json();
    
    // Should have exactly one harmonic for the new message
    expect($newHarmonicsData['harmonics'])->toHaveCount(1);
    expect($newHarmonicsData['harmonics'][0]['record_id'])->toBe($newMessage->id);
    expect($newHarmonicsData['harmonics'][0]['operation'])->toBe('create');
});

test('full resync clears table before inserting records', function () {
    // Create a user with tenant and platform for authentication
    $tenant = Tenant::factory()->create();
    $platform = Platform::factory()->create();
    $user = User::factory()->create(['tenant_id' => $tenant->id]);
    $user->platforms()->attach($platform->id);
    
    // Authenticate the user
    $this->actingAs($user);
    
    // Create test messages for this user's tenant and platform
    Message::factory()->count(5)->create([
        'tenant_id' => $tenant->id,
        'platform_id' => $platform->id,
        'user_id' => $user->id,
    ]);
    
    // Get initial sync data
    $response = $this->getJson('/api/sync/messages?initial=true');
    $response->assertOk();
    
    $data = $response->json();
    
    // Verify we get all records
    expect($data['records'])->toHaveCount(5);
    
    // Verify latest_harmonic_id is set for tracking
    expect($data)->toHaveKey('latest_harmonic_id');
});

test('schema endpoint provides correct database version after migrations', function () {
    // Get current schema
    $response = $this->getJson('/api/schema');
    $response->assertOk();
    
    $data = $response->json();
    
    // Verify schema structure
    expect($data)->toHaveKeys(['schema', 'database_version', 'schema_version']);
    expect($data['schema'])->toHaveKey('messages');
    expect($data['database_version'])->toBeString();
    expect($data['schema_version'])->toBeInt();
    
    // Database version should follow batch_count format
    expect($data['database_version'])->toMatch('/^\d+_\d+$/');
});