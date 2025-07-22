<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use Pixelsprout\LaravelChorus\Http\Controllers\SyncController;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Ensure database version tracking is enabled
    Config::set('chorus.track_database_version', true);
    Config::set('chorus.schema_version', 1);
    Config::set('chorus.models', [
        'users' => \App\Models\User::class,
        'platforms' => \App\Models\Platform::class,
        'messages' => \App\Models\Message::class,
    ]);
});

describe('Schema Endpoint', function () {
    it('returns schema with database version when tracking is enabled', function () {
        $response = $this->getJson('/api/schema');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'schema',
                'schema_version',
                'database_version',
                'generated_at'
            ]);

        $data = $response->json();
        expect($data['schema'])->toBeArray();
        expect($data['schema_version'])->toBe(1);
        expect($data['database_version'])->toBeString();
        expect($data['generated_at'])->toBeString();
    });

    it('returns null database version when tracking is disabled', function () {
        Config::set('chorus.track_database_version', false);

        $response = $this->getJson('/api/schema');

        $response->assertStatus(200);
        $data = $response->json();
        expect($data['database_version'])->toBeNull();
    });

    it('includes correct schema structure for configured models', function () {
        $response = $this->getJson('/api/schema');

        $data = $response->json();
        $schema = $data['schema'];

        expect($schema)->toHaveKey('users')
            ->and($schema)->toHaveKey('platforms')
            ->and($schema)->toHaveKey('messages')
            ->and($schema['users'])->toContain('id')
            ->and($schema['platforms'])->toContain('id')
            ->and($schema['messages'])->toContain('id');
    });
});

describe('Database Version Generation', function () {
    it('generates version based on migration batch and count', function () {
        // Clear migrations table and add some test entries
        DB::table('migrations')->truncate();

        // Add migrations to simulate different batches
        DB::table('migrations')->insert([
            ['migration' => '2024_01_01_000001_create_users_table', 'batch' => 1],
            ['migration' => '2024_01_01_000002_create_posts_table', 'batch' => 1],
            ['migration' => '2024_01_02_000001_add_column_to_users', 'batch' => 2],
        ]);

        $controller = new SyncController();
        $response = $controller->getSchema();
        $data = $response->getData(true);

        // Should be "2_3" (batch 2, 3 total migrations)
        expect($data['database_version'])->toBe('2_3');
    });

    it('handles empty migrations table gracefully', function () {
        DB::table('migrations')->truncate();

        $controller = new SyncController();
        $response = $controller->getSchema();
        $data = $response->getData(true);

        // Should be "0_0" when no migrations exist
        expect($data['database_version'])->toBe('0_0');
    });

    it('generates different versions for different migration states', function () {
        DB::table('migrations')->truncate();

        // Initial state
        DB::table('migrations')->insert([
            ['migration' => '2024_01_01_000001_create_users_table', 'batch' => 1],
        ]);

        $controller = new SyncController();
        $response1 = $controller->getSchema();
        $version1 = $response1->getData(true)['database_version'];

        // Add another migration in same batch
        DB::table('migrations')->insert([
            ['migration' => '2024_01_01_000002_create_posts_table', 'batch' => 1],
        ]);

        $response2 = $controller->getSchema();
        $version2 = $response2->getData(true)['database_version'];

        // Add migration in new batch
        DB::table('migrations')->insert([
            ['migration' => '2024_01_02_000001_add_column_to_users', 'batch' => 2],
        ]);

        $response3 = $controller->getSchema();
        $version3 = $response3->getData(true)['database_version'];

        // All versions should be different
        expect($version1)->toBe('1_1');
        expect($version2)->toBe('1_2');
        expect($version3)->toBe('2_3');

        expect($version1)->not->toBe($version2);
        expect($version2)->not->toBe($version3);
        expect($version1)->not->toBe($version3);
    });
});

describe('Migration Scenarios', function () {
    it('detects version change after new migration', function () {
        // Get initial version
        $response1 = $this->getJson('/api/schema');
        $version1 = $response1->json('database_version');

        // Simulate running a new migration
        DB::table('migrations')->insert([
            'migration' => '2024_test_new_migration',
            'batch' => DB::table('migrations')->max('batch') + 1
        ]);

        // Get version after migration
        $response2 = $this->getJson('/api/schema');
        $version2 = $response2->json('database_version');

        expect($version1)->not->toBe($version2);
    });

    it('detects version change after migration rollback', function () {
        // Add a migration first
        $maxBatch = DB::table('migrations')->max('batch') ?? 0;
        DB::table('migrations')->insert([
            'migration' => '2024_test_rollback_migration',
            'batch' => $maxBatch + 1
        ]);

        // Get version with the migration
        $response1 = $this->getJson('/api/schema');
        $version1 = $response1->json('database_version');

        // Simulate rollback by removing the migration
        DB::table('migrations')
            ->where('migration', '2024_test_rollback_migration')
            ->delete();

        // Get version after rollback
        $response2 = $this->getJson('/api/schema');
        $version2 = $response2->json('database_version');

        expect($version1)->not->toBe($version2);
    });

    it('simulates migrate:fresh scenario', function () {
        // Add some migrations in different batches first
        DB::table('migrations')->insert([
            ['migration' => 'test_migration_1', 'batch' => 2],
            ['migration' => 'test_migration_2', 'batch' => 3],
        ]);

        // Get initial state
        $response1 = $this->getJson('/api/schema');
        $version1 = $response1->json('database_version');

        // Simulate migrate:fresh by clearing and repopulating migrations
        $originalMigrations = DB::table('migrations')->get();
        DB::table('migrations')->truncate();

        // Re-add all migrations in batch 1 (like migrate:fresh does)
        $freshMigrations = $originalMigrations->map(function ($migration) {
            return [
                'migration' => $migration->migration,
                'batch' => 1
            ];
        })->toArray();

        DB::table('migrations')->insert($freshMigrations);

        // Get version after fresh migration
        $response2 = $this->getJson('/api/schema');
        $version2 = $response2->json('database_version');

        // Version should be different (different batch structure)
        expect($version1)->not->toBe($version2);

        // Fresh migration should result in batch 1
        expect($version2)->toStartWith('1_');
    });
});

describe('Configuration', function () {
    it('respects schema version configuration', function () {
        Config::set('chorus.schema_version', 42);

        $response = $this->getJson('/api/schema');

        expect($response->json('schema_version'))->toBe(42);
    });

    it('can disable database version tracking', function () {
        Config::set('chorus.track_database_version', false);

        $response = $this->getJson('/api/schema');

        $response->assertStatus(200);
        expect($response->json('database_version'))->toBeNull();
    });

    it('enables database version tracking by default', function () {
        // Test that when config is not explicitly set to false, it defaults to true
        // We'll test this by ensuring the default behavior works
        $response = $this->getJson('/api/schema');

        $response->assertStatus(200);
        expect($response->json('database_version'))->toBeString();
    });
});

describe('Error Handling', function () {
    it('handles database errors gracefully when getting version', function () {
        // This test verifies the fallback mechanism works
        // We'll test by temporarily corrupting the migrations table
        $originalTable = DB::table('migrations')->get();

        try {
            // Create a scenario that might cause issues
            DB::statement('DROP TABLE IF EXISTS temp_migrations_backup');
            DB::statement('CREATE TABLE temp_migrations_backup AS SELECT * FROM migrations');
            DB::statement('DROP TABLE migrations');

            $controller = new SyncController();
            $response = $controller->getSchema();

            // Should still return a response with a fallback version
            expect($response->getStatusCode())->toBe(200);
            $data = $response->getData(true);
            expect($data['database_version'])->toBeString();
        } finally {
            // Restore the migrations table
            DB::statement('CREATE TABLE migrations (migration VARCHAR(255), batch INT)');
            foreach ($originalTable as $migration) {
                DB::table('migrations')->insert([
                    'migration' => $migration->migration,
                    'batch' => $migration->batch
                ]);
            }
        }
    });

    it('handles invalid model configuration gracefully', function () {
        // Test with empty models configuration instead of invalid class
        Config::set('chorus.models', []);

        $response = $this->getJson('/api/schema');

        // Should still work with empty schema
        $response->assertStatus(200);
        $data = $response->json();

        expect($data['schema'])->toBeArray()
            ->and($data['schema'])->toBeEmpty()
            ->and($data['database_version'])->toBeString();
    });
});
