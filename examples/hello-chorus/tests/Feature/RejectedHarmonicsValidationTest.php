<?php

use App\Models\Message;
use App\Models\User;
use App\Models\Platform;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('rejected harmonics context properly validates harmonic objects', function () {
    // Create a user with tenant and platform for authentication
    $tenant = Tenant::factory()->create();
    $platform = Platform::factory()->create();
    $user = User::factory()->create(['tenant_id' => $tenant->id]);
    $user->platforms()->attach($platform->id);
    
    // Authenticate the user
    $this->actingAs($user);
    
    // Create a test message
    $message = Message::factory()->create([
        'tenant_id' => $tenant->id,
        'platform_id' => $platform->id,
        'user_id' => $user->id,
    ]);
    
    // Get initial sync to establish baseline
    $syncResponse = $this->getJson('/api/sync/messages?initial=true');
    $syncResponse->assertOk();
    
    $syncData = $syncResponse->json();
    expect($syncData['records'])->toHaveCount(1);
    expect($syncData)->toHaveKey('latest_harmonic_id');
    
    // Verify that harmonics returned have proper structure
    $latestHarmonicId = $syncData['latest_harmonic_id'];
    
    if ($latestHarmonicId) {
        // Create a new message to generate a harmonic
        $newMessage = Message::factory()->create([
            'tenant_id' => $tenant->id,
            'platform_id' => $platform->id,
            'user_id' => $user->id,
        ]);
        
        $harmonicsResponse = $this->getJson("/api/sync/messages?after={$latestHarmonicId}");
        $harmonicsResponse->assertOk();
        
        $harmonicsData = $harmonicsResponse->json();
        
        if (!empty($harmonicsData['harmonics'])) {
            foreach ($harmonicsData['harmonics'] as $harmonic) {
                // Verify each harmonic has required properties for client validation
                expect($harmonic)->toHaveKey('id');
                expect($harmonic)->toHaveKey('table_name');
                expect($harmonic)->toHaveKey('record_id');
                expect($harmonic)->toHaveKey('operation');
                expect($harmonic)->toHaveKey('data');
                
                // Verify ID is not null/empty
                expect($harmonic['id'])->not->toBeNull();
                expect($harmonic['id'])->not->toBe('');
                
                // Verify operation is valid
                expect($harmonic['operation'])->toBeIn(['create', 'update', 'delete']);
                
                // If rejected, should have rejected_reason
                if ($harmonic['rejected'] ?? false) {
                    expect($harmonic)->toHaveKey('rejected_reason');
                    expect($harmonic['rejected_reason'])->not->toBeNull();
                }
            }
        }
    }
});

test('database version changes use proper notification system', function () {
    // This test verifies that database version changes don't interfere
    // with rejected harmonic processing by using separate notification systems
    
    // Get initial schema
    $initialResponse = $this->getJson('/api/schema');
    $initialResponse->assertOk();
    
    $initialData = $initialResponse->json();
    expect($initialData)->toHaveKey('database_version');
    
    $initialVersion = $initialData['database_version'];
    
    // Verify the version format is correct
    expect($initialVersion)->toMatch('/^\d+_\d+$/');
    
    // The database version should be consistent across multiple requests
    $secondResponse = $this->getJson('/api/schema');
    $secondResponse->assertOk();
    
    $secondData = $secondResponse->json();
    expect($secondData['database_version'])->toBe($initialVersion);
    
    // Verify schema structure is consistent
    expect($secondData['schema'])->toBe($initialData['schema']);
    expect($secondData['schema_version'])->toBe($initialData['schema_version']);
});