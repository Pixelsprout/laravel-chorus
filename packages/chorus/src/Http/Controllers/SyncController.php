<?php

namespace Pixelsprout\LaravelChorus\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Pixelsprout\LaravelChorus\Support\ModelsThat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;
use Pixelsprout\LaravelChorus\Models\Harmonic;
use ReflectionClass;

class SyncController extends Controller
{
    public function getInitialData(
        Request $request,
        string $table
    ): \Illuminate\Http\JsonResponse {
        try {
            // Get the 'after' parameter (harmonic ID) from the request
            $afterHarmonicId = $request->query("after");

            // Get all available models with Harmonics trait from config
            $modelMap = config("chorus.models", []);

            if (!isset($modelMap[$table])) {
                return response()->json(
                    ["error" => "Invalid table name", "table" => $table],
                    404
                );
            }

            $modelClass = $modelMap[$table];
            $instance = new $modelClass();

            $modelReflection = new ReflectionClass($modelClass);

            $hasHarmonicsTrait = in_array(
                "Pixelsprout\LaravelChorus\Traits\Harmonics",
                $modelReflection->getTraitNames()
            );

            // Check if model has a method to get syncFields (added by Harmonics trait)
            if (!$hasHarmonicsTrait) {
                return response()->json(
                    [
                        "error" => "Model does not use Harmonics trait",
                        "model" => $modelClass,
                    ],
                    400
                );
            }

            // Check if a client has no existing data (first sync)
            $initialSync = $request->query("initial") === "true";

            if ($initialSync) {
                // For initial sync, return all records with the latest harmonic ID
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

                dd([
                    "session_id" => $sessionId,
                    "session_record_exists" => $sessionRecord ? true : false,
                    "payload_decoded" => $sessionRecord
                        ? unserialize(base64_decode($sessionRecord->payload))
                        : null,
                ]);

                // Get the sync filter if defined
                $syncFilter = $instance->getSyncFilter();

                // Start query with the model class
                $query = $modelClass::select($syncFields);

                // Apply sync filter if one is provided by the model
                if ($syncFilter !== null) {
                    // Apply the filter constraints to our query
                    $query = $syncFilter;
                }

                // Get records with pagination
                $records = $query->take($limit)->get();

                dd($records);

                // Get the latest harmonic ID for this table
                $latestHarmonic = Harmonic::where("table_name", $table)
                    ->latest("id")
                    ->first();

                // Return records and the latest harmonic ID
                return response()->json([
                    "latest_harmonic_id" => $latestHarmonic
                        ? $latestHarmonic->id
                        : null,
                    "records" => $records,
                ]);
            }

            // For incremental sync, return harmonics since the given ID
            $harmonicsQuery = Harmonic::where("table_name", $table);

            if ($afterHarmonicId) {
                $harmonicsQuery->where("id", ">", $afterHarmonicId);
            }

            // Get the sync filter if defined
            $syncFilter = $instance->getSyncFilter();

            // If there's a filter defined, we need to filter harmonics by record_id
            if ($syncFilter !== null) {
                // Get the filtered record IDs
                $filteredRecordIds = $syncFilter->pluck(
                    $instance->getKeyName()
                );

                // Filter harmonics to only those matching the filter
                $harmonicsQuery->whereIn("record_id", $filteredRecordIds);
            }

            // Add a reasonable limit to prevent huge responses
            $limit = (int) $request->query("limit", 500);

            // Get harmonics ordered by ID (chronological order)
            $harmonics = $harmonicsQuery->orderBy("id")->take($limit)->get();

            // Format the response with the latest harmonic ID
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
            // Log the error
            \Log::error("Error in getInitialData", [
                "table" => $table,
                "error" => $e->getMessage(),
                "trace" => $e->getTraceAsString(),
            ]);

            // Return a JSON error response
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
