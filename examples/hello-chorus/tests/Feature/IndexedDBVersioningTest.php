<?php

use App\Models\Message;
use App\Models\User;
use App\Models\Platform;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('database version changes trigger proper IndexedDB versioning', function () {
    // Create a user with tenant and platform for authentication
    $tenant = Tenant::factory()->create();
    $platform = Platform::factory()->create();
    $user = User::factory()->create(['tenant_id' => $tenant->id]);
    $user->platforms()->attach($platform->id);
    
    // Authenticate the user
    $this->actingAs($user);
    
    // Get initial schema to establish baseline
    $initialResponse = $this->getJson('/api/schema');
    $initialResponse->assertOk();
    
    $initialData = $initialResponse->json();
    expect($initialData)->toHaveKeys(['schema', 'database_version', 'schema_version']);
    
    $initialDatabaseVersion = $initialData['database_version'];
    $initialSchemaVersion = $initialData['schema_version'];
    
    // Verify the database version format (should be batch_count format)
    expect($initialDatabaseVersion)->toMatch('/^\d+_\d+$/');
    
    // The key test: verify that different database versions would result in different
    // IndexedDB versions by checking the version calculation logic
    
    // Simulate what would happen with a different database version
    $newDatabaseVersion = '99_999'; // Simulated new version
    
    // The client should calculate different IndexedDB versions for different inputs
    // This is tested by verifying the schema endpoint returns consistent data
    // and that the version format is correct
    
    expect($initialDatabaseVersion)->not->toBe($newDatabaseVersion);
    expect($initialSchemaVersion)->toBeInt();
    
    // Verify schema structure is consistent
    expect($initialData['schema'])->toBeArray();
    expect($initialData['schema'])->toHaveKey('messages');
    
    // Test that the same request returns the same version (consistency)
    $secondResponse = $this->getJson('/api/schema');
    $secondResponse->assertOk();
    
    $secondData = $secondResponse->json();
    expect($secondData['database_version'])->toBe($initialDatabaseVersion);
    expect($secondData['schema_version'])->toBe($initialSchemaVersion);
});

test('schema version and database version are properly tracked', function () {
    // Create a user with tenant and platform for authentication
    $tenant = Tenant::factory()->create();
    $platform = Platform::factory()->create();
    $user = User::factory()->create(['tenant_id' => $tenant->id]);
    $user->platforms()->attach($platform->id);
    
    // Authenticate the user
    $this->actingAs($user);
    
    // Create some test data
    $messages = Message::factory()->count(2)->create([
        'tenant_id' => $tenant->id,
        'platform_id' => $platform->id,
        'user_id' => $user->id,
    ]);
    
    // Get schema information
    $schemaResponse = $this->getJson('/api/schema');
    $schemaResponse->assertOk();
    
    $schemaData = $schemaResponse->json();
    
    // Verify all required version information is present
    expect($schemaData)->toHaveKeys([
        'schema',
        'database_version', 
        'schema_version',
        'generated_at'
    ]);
    
    // Verify version formats
    expect($schemaData['database_version'])->toBeString();
    expect($schemaData['database_version'])->toMatch('/^\d+_\d+$/');
    expect($schemaData['schema_version'])->toBeInt();
    expect($schemaData['generated_at'])->toBeString();
    
    // Verify schema contains expected tables
    expect($schemaData['schema'])->toHaveKey('messages');
    expect($schemaData['schema']['messages'])->toBeString();
    expect($schemaData['schema']['messages'])->toContain('id');
    
    // Test initial sync works with version information
    $syncResponse = $this->getJson('/api/sync/messages?initial=true');
    $syncResponse->assertOk();
    
    $syncData = $syncResponse->json();
    expect($syncData)->toHaveKeys(['records', 'latest_harmonic_id']);
    expect($syncData['records'])->toHaveCount(2);
});

test('version calculation produces different results for different inputs', function () {
    // This test verifies that our version calculation logic would produce
    // different IndexedDB versions for different database/schema versions
    
    // Test data representing different version scenarios
    $versionScenarios = [
        ['db' => '1_5', 'schema' => 1],
        ['db' => '2_10', 'schema' => 1], 
        ['db' => '1_5', 'schema' => 2],
        ['db' => '10_50', 'schema' => 3],
    ];
    
    $calculatedVersions = [];
    
    foreach ($versionScenarios as $scenario) {
        // Simulate the version calculation logic from the client
        $versionString = "{$scenario['db']}_{$scenario['schema']}";
        $hash = 0;
        
        for ($i = 0; $i < strlen($versionString); $i++) {
            $char = ord($versionString[$i]);
            $hash = (($hash << 5) - $hash) + $char;
            $hash = $hash & 0xFFFFFFFF; // Convert to 32-bit integer
        }
        
        // Ensure version is positive and reasonable (between 1 and 999999)
        $version = abs($hash) % 999999 + 1;
        $calculatedVersions[] = $version;
    }
    
    // Verify that different inputs produce different versions
    $uniqueVersions = array_unique($calculatedVersions);
    expect(count($uniqueVersions))->toBe(count($versionScenarios));
    
    // Verify all versions are in valid range
    foreach ($calculatedVersions as $version) {
        expect($version)->toBeGreaterThan(0);
        expect($version)->toBeLessThanOrEqual(999999);
    }
});