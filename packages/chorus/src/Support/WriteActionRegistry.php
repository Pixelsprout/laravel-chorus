<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Support;

use Illuminate\Support\Facades\Route;
use Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController;
use Pixelsprout\LaravelChorus\Traits\Harmonics;

final class WriteActionRegistry
{
    /**
     * Register write action routes for all models with Harmonics trait
     */
    public static function registerRoutes(): void
    {
        $models = ModelsThat::useTrait(Harmonics::class);

        foreach ($models as $modelClass) {
            $model = new $modelClass();
            $tableName = $model->getChorusTableName();
            $writeActions = $model->getWriteActions();

            if (! empty($writeActions)) {
                self::registerModelRoutes($tableName, $writeActions);
            }
        }
    }

    /**
     * Get all available write actions across all models
     */
    public static function getAllActions(): array
    {
        $allActions = [];
        $models = ModelsThat::useTrait(Harmonics::class);

        foreach ($models as $modelClass) {
            $model = new $modelClass();
            $tableName = $model->getChorusTableName();
            $writeActions = $model->getWriteActions();

            if (! empty($writeActions)) {
                $actions = [];
                foreach ($writeActions as $actionName => $actionConfig) {
                    $action = $model->getWriteAction($actionName);
                    if ($action) {
                        $actions[$actionName] = [
                            'name' => $actionName,
                            'config' => $action->getConfig(),
                            'rules' => $action->rules(),
                            'allowsOfflineWrites' => $action->allowsOfflineWrites(),
                            'supportsBatch' => $action->supportsBatch(),
                            'route' => route("chorus.{$tableName}.{$actionName}"),
                        ];
                    }
                }

                $allActions[$tableName] = [
                    'model' => $modelClass,
                    'table' => $tableName,
                    'actions' => $actions,
                    'batchRoute' => route("chorus.{$tableName}.batch"),
                ];
            }
        }

        return $allActions;
    }

    /**
     * Get write actions for a specific table
     */
    public static function getActionsForTable(string $tableName): ?array
    {
        $allActions = self::getAllActions();

        return $allActions[$tableName] ?? null;
    }

    /**
     * Register routes for a specific model's write actions
     */
    private static function registerModelRoutes(string $tableName, array $writeActions): void
    {
        foreach ($writeActions as $actionName => $actionConfig) {
            // Register individual action route
            Route::post("chorus/{$tableName}/{$actionName}", [ChorusWriteController::class, 'handleAction'])
                ->name("chorus.{$tableName}.{$actionName}");
        }

        // Register batch route for the table
        Route::post("chorus/{$tableName}/batch", [ChorusWriteController::class, 'handleBatch'])
            ->name("chorus.{$tableName}.batch");
    }
}
