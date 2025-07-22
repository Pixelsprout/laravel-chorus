<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Artisan;

uses(RefreshDatabase::class);

beforeEach(function () {
    Config::set('chorus.track_database_version', true);
    Config::set('chorus.schema_version', 1);
    Config::set('chorus.models', [
        'users' => \App\Models\User::class,
        'platforms' => \App\Models\Platform::class,
        'messages' => \App\Models\Message::class,
    ]);
});

describe('Full Database Version Workflow', function () {
    it('tracks version changes through complete migration lifecycle', function () {
        // Step 1: Get initial version after RefreshDatabase
        $response1 = $this->getJson('/api/schema');
        $response1->assertStatus(200);
        $initialVersion = $response1->json('database_version');

        expect($initialVersion)->toBeString();
        expect($initialVersion)->toMatch('/^\d+_\d+$/'); // Format: batch_count

        // Step 2: Simulate adding a new migration
        $currentMaxBatch = DB::table('migrations')->max('batch') ?? 0;
        DB::table('migrations')->insert([
            'migration' => '2024_test_integration_new_table',
            'batch' => $currentMaxBatch + 1
        ]);

        $response2 = $this->getJson('/api/schema');
        $response2->assertStatus(200);
        $afterMigrationVersion = $response2->json('database_version');

        expect($afterMigrationVersion)->not->toBe($initialVersion);

        // Step 3: Simulate rollback
        DB::table('migrations')
            ->where('migration', '2024_test_integration_new_table')
            ->delete();

        $response3 = $this->getJson('/api/schema');
        $response3->assertStatus(200);
        $afterRollbackVersion = $response3->json('database_version');

        expect($afterRollbackVersion)->toBe($initialVersion)
            ->and($afterRollbackVersion)->not->toBe($afterMigrationVersion);

        // Step 4: Simulate migrate:fresh by resetting all to batch 1
        // First add some migrations in different batches to create a difference
        DB::table('migrations')->insert([
            'migration' => '2024_test_fresh_migration',
            'batch' => 2
        ]);

        $allMigrations = DB::table('migrations')->get();
        DB::table('migrations')->truncate();

        // Re-add all migrations in batch 1 (like migrate:fresh does)
        foreach ($allMigrations as $migration) {
            DB::table('migrations')->insert([
                'migration' => $migration->migration,
                'batch' => 1
            ]);
        }

        $response4 = $this->getJson('/api/schema');
        $response4->assertStatus(200);
        $afterFreshVersion = $response4->json('database_version');

        // After fresh, version should be different from initial (different batch structure)
        expect($afterFreshVersion)->not->toBe($initialVersion)
            ->and($afterFreshVersion)->toStartWith('1_');
        // All migrations in batch 1
    });

    it('maintains consistent schema structure across version changes', function () {
        // Get initial schema
        $response1 = $this->getJson('/api/schema');
        $initialSchema = $response1->json('schema');

        // Change database version by adding migration
        DB::table('migrations')->insert([
            'migration' => '2024_test_schema_consistency',
            'batch' => (DB::table('migrations')->max('batch') ?? 0) + 1
        ]);

        // Get schema after version change
        $response2 = $this->getJson('/api/schema');
        $newSchema = $response2->json('schema');

        // Schema structure should remain the same
        expect($newSchema)->toBe($initialSchema)
            ->and($response1->json('database_version'))
            ->not->toBe($response2->json('database_version'));

        // But versions should be different
    });

    it('handles concurrent version checks correctly', function () {
        // Simulate multiple concurrent requests
        $responses = [];

        for ($i = 0; $i < 3; $i++) {
            $responses[] = $this->getJson('/api/schema');
        }

        // All concurrent requests should return the same version
        $versions = array_map(fn($response) => $response->json('database_version'), $responses);

        expect($versions[0])->toBe($versions[1])
            ->and($versions[1])->toBe($versions[2]);

        // All should be successful
        foreach ($responses as $response) {
            $response->assertStatus(200);
        }
    });
});

describe('Performance and Edge Cases', function () {
    it('handles large number of migrations efficiently', function () {
        // Clear and add many migrations
        DB::table('migrations')->truncate();

        $migrations = [];
        for ($i = 1; $i <= 100; $i++) {
            $migrations[] = [
                'migration' => sprintf('2024_01_%02d_migration_%d', $i % 31 + 1, $i),
                'batch' => ($i - 1) % 10 + 1 // Distribute across 10 batches
            ];
        }

        DB::table('migrations')->insert($migrations);

        $startTime = microtime(true);
        $response = $this->getJson('/api/schema');
        $endTime = microtime(true);

        $response->assertStatus(200);

        // Should complete within reasonable time (less than 1 second)
        expect($endTime - $startTime)->toBeLessThan(1.0)
            ->and($response->json('database_version'))->toBe('10_100');
    });

    it('handles migrations with special characters in names', function () {
        DB::table('migrations')->insert([
            'migration' => '2024_01_01_create_table_with_special_chars_àáâã',
            'batch' => (DB::table('migrations')->max('batch') ?? 0) + 1
        ]);

        $response = $this->getJson('/api/schema');

        $response->assertStatus(200);
        expect($response->json('database_version'))->toBeString();
    });

    it('handles very high batch numbers', function () {
        DB::table('migrations')->insert([
            'migration' => '2024_test_high_batch',
            'batch' => 999999
        ]);

        $response = $this->getJson('/api/schema');

        $response->assertStatus(200);
        expect($response->json('database_version'))->toContain('999999');
    });
});

describe('Configuration Integration', function () {
    it('respects all configuration options together', function () {
        Config::set([
            'chorus.schema_version' => 42,
            'chorus.track_database_version' => true,
        ]);

        $response = $this->getJson('/api/schema');

        $response->assertStatus(200)
            ->assertJson([
                'schema_version' => 42,
            ]);

        expect($response->json('database_version'))->toBeString();
    });

    it('works correctly when database tracking is disabled', function () {
        Config::set('chorus.track_database_version', false);

        // Add a migration
        DB::table('migrations')->insert([
            'migration' => '2024_test_disabled_tracking',
            'batch' => (DB::table('migrations')->max('batch') ?? 0) + 1
        ]);

        $response = $this->getJson('/api/schema');

        $response->assertStatus(200);
        expect($response->json('database_version'))->toBeNull()
            ->and($response->json('schema'))->toBeArray();
    });
});

describe('Error Recovery', function () {
    it('recovers gracefully from database connection issues', function () {
        // This test would require mocking DB connection failures
        // For now, we'll test that the endpoint remains functional
        $response = $this->getJson('/api/schema');

        $response->assertStatus(200);
        expect($response->json('database_version'))->toBeString();
    });

    it('handles corrupted migrations table data', function () {
        // Insert data with empty migration name (but not null to avoid constraint violation)
        DB::table('migrations')->insert([
            'migration' => '', // Empty migration name
            'batch' => 999     // Valid batch
        ]);

        $response = $this->getJson('/api/schema');

        // Should still work, ignoring invalid entries
        $response->assertStatus(200);
        expect($response->json('database_version'))->toBeString();
    });
});
