<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use Pixelsprout\LaravelChorus\Http\Controllers\SyncController;

uses(RefreshDatabase::class);

// Helper function to call private methods using reflection
function callPrivateMethod($object, $methodName, ...$args)
{
    $reflection = new ReflectionClass($object);
    $method = $reflection->getMethod($methodName);
    $method->setAccessible(true);
    return $method->invoke($object, ...$args);
}

beforeEach(function () {
    Config::set('chorus.track_database_version', true);
});

describe('Database Version Logic', function () {
    it('calculates version correctly with multiple batches', function () {
        DB::table('migrations')->truncate();
        
        // Insert migrations across different batches
        DB::table('migrations')->insert([
            ['migration' => 'migration_1', 'batch' => 1],
            ['migration' => 'migration_2', 'batch' => 1],
            ['migration' => 'migration_3', 'batch' => 1],
            ['migration' => 'migration_4', 'batch' => 2],
            ['migration' => 'migration_5', 'batch' => 3],
        ]);

        $controller = new SyncController();
        $version = callPrivateMethod($controller, 'getDatabaseVersion');

        // Should be "3_5" (max batch 3, 5 total migrations)
        expect($version)->toBe('3_5');
    });

    it('handles single batch correctly', function () {
        DB::table('migrations')->truncate();
        
        DB::table('migrations')->insert([
            ['migration' => 'migration_1', 'batch' => 1],
            ['migration' => 'migration_2', 'batch' => 1],
        ]);

        $controller = new SyncController();
        $version = callPrivateMethod($controller, 'getDatabaseVersion');

        expect($version)->toBe('1_2');
    });

    it('returns 0_0 for empty migrations table', function () {
        DB::table('migrations')->truncate();

        $controller = new SyncController();
        $version = callPrivateMethod($controller, 'getDatabaseVersion');

        expect($version)->toBe('0_0');
    });

    it('handles large batch numbers', function () {
        DB::table('migrations')->truncate();
        
        DB::table('migrations')->insert([
            ['migration' => 'migration_1', 'batch' => 999],
            ['migration' => 'migration_2', 'batch' => 1000],
        ]);

        $controller = new SyncController();
        $version = callPrivateMethod($controller, 'getDatabaseVersion');

        expect($version)->toBe('1000_2');
    });

    it('provides fallback version on database error', function () {
        // Mock DB facade to throw exception
        DB::shouldReceive('table')
            ->with('migrations')
            ->andThrow(new \Exception('Connection failed'));

        $controller = new SyncController();
        $version = callPrivateMethod($controller, 'getDatabaseVersion');

        // Should return a timestamp-based fallback
        expect($version)->toBeString();
        expect($version)->toMatch('/^\d+$/'); // Should be numeric (timestamp)
    });
});

describe('Version Comparison Scenarios', function () {
    it('generates different versions for common migration scenarios', function () {
        $controller = new SyncController();
        
        // Scenario 1: Initial migrations
        DB::table('migrations')->truncate();
        DB::table('migrations')->insert([
            ['migration' => '2024_01_01_create_users', 'batch' => 1],
            ['migration' => '2024_01_02_create_posts', 'batch' => 1],
        ]);
        $version1 = callPrivateMethod($controller, 'getDatabaseVersion');

        // Scenario 2: Add new migration
        DB::table('migrations')->insert([
            ['migration' => '2024_01_03_add_column', 'batch' => 2],
        ]);
        $version2 = callPrivateMethod($controller, 'getDatabaseVersion');

        // Scenario 3: Rollback (remove last migration)
        DB::table('migrations')->where('batch', 2)->delete();
        $version3 = callPrivateMethod($controller, 'getDatabaseVersion');

        // Scenario 4: Fresh migration (all in batch 1)
        DB::table('migrations')->update(['batch' => 1]);
        $version4 = callPrivateMethod($controller, 'getDatabaseVersion');

        expect($version1)->toBe('1_2');
        expect($version2)->toBe('2_3');
        expect($version3)->toBe('1_2'); // Back to original
        expect($version4)->toBe('1_2'); // Same count, different batch structure

        // Verify all scenarios produce trackable changes
        expect($version1)->not->toBe($version2);
        expect($version2)->not->toBe($version3);
    });

    it('detects subtle migration changes', function () {
        $controller = new SyncController();
        
        // Start with some migrations
        DB::table('migrations')->truncate();
        DB::table('migrations')->insert([
            ['migration' => 'migration_a', 'batch' => 1],
            ['migration' => 'migration_b', 'batch' => 2],
        ]);
        $versionBefore = callPrivateMethod($controller, 'getDatabaseVersion');

        // Add migration in existing batch (rare but possible)
        DB::table('migrations')->insert([
            ['migration' => 'migration_c', 'batch' => 1],
        ]);
        $versionAfter = callPrivateMethod($controller, 'getDatabaseVersion');

        // Should detect the change (count increased)
        expect($versionBefore)->toBe('2_2');
        expect($versionAfter)->toBe('2_3');
        expect($versionBefore)->not->toBe($versionAfter);
    });
});

describe('Real Migration Simulation', function () {
    it('simulates actual Laravel migration workflow', function () {
        $controller = new SyncController();
        
        // Start fresh (like after migrate:fresh)
        DB::table('migrations')->truncate();
        
        // Add base migrations (like Laravel's default migrations)
        $baseMigrations = [
            '2014_10_12_000000_create_users_table',
            '2014_10_12_100000_create_password_resets_table',
            '2019_08_19_000000_create_failed_jobs_table',
        ];
        
        foreach ($baseMigrations as $migration) {
            DB::table('migrations')->insert([
                'migration' => $migration,
                'batch' => 1
            ]);
        }
        
        $initialVersion = callPrivateMethod($controller, 'getDatabaseVersion');
        expect($initialVersion)->toBe('1_3');

        // Run new migration
        DB::table('migrations')->insert([
            'migration' => '2024_01_01_create_posts_table',
            'batch' => 2
        ]);
        
        $afterNewMigration = callPrivateMethod($controller, 'getDatabaseVersion');
        expect($afterNewMigration)->toBe('2_4');

        // Run another migration in same batch
        DB::table('migrations')->insert([
            'migration' => '2024_01_02_create_comments_table',
            'batch' => 2
        ]);
        
        $afterBatchMigration = callPrivateMethod($controller, 'getDatabaseVersion');
        expect($afterBatchMigration)->toBe('2_5');

        // Rollback last batch
        DB::table('migrations')->where('batch', 2)->delete();
        
        $afterRollback = callPrivateMethod($controller, 'getDatabaseVersion');
        expect($afterRollback)->toBe('1_3'); // Back to initial state

        // All versions should be unique except initial and rollback
        expect($initialVersion)->not->toBe($afterNewMigration);
        expect($afterNewMigration)->not->toBe($afterBatchMigration);
        expect($afterBatchMigration)->not->toBe($afterRollback);
        expect($initialVersion)->toBe($afterRollback); // Should match after rollback
    });
});