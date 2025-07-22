<?php

use App\Models\Message;
use App\Models\User;
use App\Models\Platform;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('client can handle duplicate records during resync without errors', function () {
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
    
    // Simulate initial sync - get all records
    $initialResponse = $this->getJson('/api/sync/messages?initial=true');
    $initialResponse->assertOk();
    
    $initialData = $initialResponse->json();
    expect($initialData['records'])->toHaveCount(3);
    
    $latestHarmonicId = $initialData['latest_harmonic_id'];
    
    // Simulate what happens during a database rebuild:
    // 1. Client gets schema and detects version change
    // 2. Client rebuilds database and does full resync (initial=true)
    // 3. Client then processes any harmonics after the latest_harmonic_id
    
    // Step 2: Full resync (this would clear the table and re-insert all records)
    $resyncResponse = $this->getJson('/api/sync/messages?initial=true');
    $resyncResponse->assertOk();
    
    $resyncData = $resyncResponse->json();
    expect($resyncData['records'])->toHaveCount(3);
    
    // Step 3: Get harmonics after the latest ID (should be empty since no new changes)
    if ($latestHarmonicId) {
        $harmonicsResponse = $this->getJson("/api/sync/messages?after={$latestHarmonicId}");
        $harmonicsResponse->assertOk();
        
        $harmonicsData = $harmonicsResponse->json();
        expect($harmonicsData['harmonics'])->toBeEmpty();
    }
    
    // The key test: Create a new message and verify harmonics work correctly
    $newMessage = Message::factory()->create([
        'tenant_id' => $tenant->id,
        'platform_id' => $platform->id,
        'user_id' => $user->id,
    ]);
    
    // Get harmonics after the original latest ID - should only contain the new message
    $newHarmonicsResponse = $this->getJson("/api/sync/messages?after={$latestHarmonicId}");
    $newHarmonicsResponse->assertOk();
    
    $newHarmonicsData = $newHarmonicsResponse->json();
    expect($newHarmonicsData['harmonics'])->toHaveCount(1);
    expect($newHarmonicsData['harmonics'][0]['record_id'])->toBe($newMessage->id);
    
    // This test verifies that:
    // 1. Initial sync returns all records
    // 2. Harmonics after a known ID only return new changes
    // 3. No duplicate key errors occur when processing harmonics after a resync
});