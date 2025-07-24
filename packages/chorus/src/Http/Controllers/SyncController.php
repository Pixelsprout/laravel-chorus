<?php

namespace Pixelsprout\LaravelChorus\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Pixelsprout\LaravelChorus\Support\ModelsThat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;
use Pixelsprout\LaravelChorus\Models\Harmonic;
use Pixelsprout\LaravelChorus\Traits\Harmonics;
use ReflectionClass;

class SyncController extends Controller
{
    /**
     * Cache for table-to-model mapping to avoid repeated model scanning
     */
    private static ?array $cachedTableModelMap = null;

    /**
     * Get a mapping of table names to model classes for models that use the Harmonics trait
     */
    private function getHarmonicsTableModelMap(): array
    {        
        if (self::$cachedTableModelMap !== null) {
            return self::$cachedTableModelMap;
        }

        $harmonicsModels = ModelsThat::useTrait(Harmonics::class);
        Log::info('Found Harmonics models', ['models' => $harmonicsModels->toArray()]);
        $tableModelMap = [];

        foreach ($harmonicsModels as $modelClass) {
            try {
                $instance = new $modelClass();
                $tableName = $instance->getTable();
                $tableModelMap[$tableName] = $modelClass;
            } catch (\Exception $e) {
                Log::warning("Error mapping table for {$modelClass}: " . $e->getMessage());
                continue;
            }
        }

        self::$cachedTableModelMap = $tableModelMap;
        Log::info('Built table model map', ['mapping' => $tableModelMap]);
        return $tableModelMap;
    }

    /**
     * Clear the cached table-to-model mapping (useful for testing)
     */
    public static function clearTableModelCache(): void
    {
        self::$cachedTableModelMap = null;
    }
    public function getSchema(): \Illuminate\Http\JsonResponse
    {
        try {
            // Get table-to-model mapping for all models that use the Harmonics trait
            $tableModelMap = $this->getHarmonicsTableModelMap();
            $schema = [];
            
            foreach ($tableModelMap as $tableName => $modelClass) {
                try {
                    $instance = new $modelClass();
                    $syncFields = $instance->getSyncFields();
                    $primaryKey = $instance->getKeyName();
                    
                    // Create IndexedDB table schema
                    // Format: tableName: 'primaryKey, field1, field2, ...'
                    $fields = implode(', ', array_filter($syncFields, fn($field) => $field !== $primaryKey));
                    $schema[$tableName] = $primaryKey . ($fields ? ', ' . $fields : '');
                } catch (\Exception $e) {
                    Log::warning("Error generating schema for {$modelClass}: " . $e->getMessage());
                    continue;
                }
            }
            
            // Get database version based on migrations (if enabled)
            $databaseVersion = config('chorus.track_database_version', true) 
                ? $this->getDatabaseVersion() 
                : null;
            
            return response()->json([
                'schema' => $schema,
                'schema_version' => config('chorus.schema_version', 1),
                'database_version' => $databaseVersion,
                'generated_at' => now()->toISOString()
            ]);
        } catch (\Exception $e) {
            Log::error("Error in getSchema", [
                "error" => $e->getMessage(),
                "trace" => $e->getTraceAsString(),
            ]);

            return response()->json([
                "error" => "Internal server error",
                "message" => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get database version based on migration state
     */
    private function getDatabaseVersion(): string
    {
        try {
            // Get the latest migration batch and count of migrations
            $latestBatch = DB::table('migrations')->max('batch') ?? 0;
            $migrationCount = DB::table('migrations')->count();
            
            // Create a version string that changes when migrations are run
            // Format: batch_count (e.g., "5_23" means batch 5 with 23 total migrations)
            return "{$latestBatch}_{$migrationCount}";
        } catch (\Exception $e) {
            Log::warning("Could not determine database version: " . $e->getMessage());
            // Fallback to timestamp-based version
            return (string) time();
        }
    }
    public function getInitialData(
        Request $request,
        string $table
    ): \Illuminate\Http\JsonResponse {
        try {
            $afterHarmonicId = $request->query("after");

            $tableModelMap = $this->getHarmonicsTableModelMap();
            
            if (!isset($tableModelMap[$table])) {
                return response()->json(
                    ["error" => "Invalid table name or table does not use Harmonics trait", "table" => $table],
                    404
                );
            }

            $modelClass = $tableModelMap[$table];
            $instance = new $modelClass();

            $initialSync = $request->query("initial") === "true";

            if ($initialSync) {
                $syncFields = $instance->getSyncFields();

                if (empty($syncFields)) {
                    return response()->json(
                        [
                            "error" => "Model does not have syncFields defined",
                            "model" => $modelClass,
                        ],
                        400
                    );
                }

                // Get pagination parameters
                $limit = (int) $request->query("limit", 1000);

                $sessionId = session()->getId();
                $sessionRecord = DB::table("sessions")
                    ->where("id", $sessionId)
                    ->first();

                $syncFilter = $instance->getSyncFilter();

                $query = $modelClass::select($syncFields);

                if ($syncFilter !== null) {
                    $query = $syncFilter;
                }

                $records = $query->take($limit)->get();

                $latestHarmonic = Harmonic::where("table_name", $table)
                    ->latest("id")
                    ->first();

                return response()->json([
                    "latest_harmonic_id" => $latestHarmonic
                        ? $latestHarmonic->id
                        : null,
                    "records" => $records,
                ]);
            }

            $harmonicsQuery = Harmonic::where("table_name", $table);

            if ($afterHarmonicId) {
                $harmonicsQuery->where("id", ">", $afterHarmonicId);
            }

            $syncFilter = $instance->getSyncFilter();

            if ($syncFilter !== null) {
                $filteredRecordIds = $syncFilter->pluck(
                    $instance->getKeyName()
                );

                $harmonicsQuery->whereIn("record_id", $filteredRecordIds);
            }

            $limit = (int) $request->query("limit", 500);

            $harmonics = $harmonicsQuery->orderBy("id")->take($limit)->get();

            $latestHarmonicId =
                $harmonics->count() > 0
                    ? $harmonics->last()->id
                    : $afterHarmonicId ?? null;

            return response()
                ->json([
                    "latest_harmonic_id" => $latestHarmonicId,
                    "harmonics" => $harmonics,
                ])
                ->header("Cache-Control", "private, max-age=10"); // 10-second client cache
        } catch (\Exception $e) {
            Log::error("Error in getInitialData", [
                "table" => $table,
                "error" => $e->getMessage(),
                "trace" => $e->getTraceAsString(),
            ]);

            return response()->json(
                [
                    "error" => "Internal server error",
                    "message" => $e->getMessage(),
                ],
                500
            );
        }
    }
}
