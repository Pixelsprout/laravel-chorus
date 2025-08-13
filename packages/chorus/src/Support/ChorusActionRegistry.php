<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Support;

use Illuminate\Support\Facades\Route;
use Pixelsprout\LaravelChorus\Http\Controllers\ChorusWriteController;
use Pixelsprout\LaravelChorus\Traits\Harmonics;

final class ChorusActionRegistry
{
    /**
     * Get all available chorus actions across all models
     */
    public static function getAllActions(): array
    {
        $allActions = [];
        $models = ModelsThat::useTrait(Harmonics::class);

        foreach ($models as $modelClass) {
            $model = new $modelClass();
            $tableName = $model->getChorusTableName();
            $chorusActions = $model->getChorusActions();

            if (! empty($chorusActions)) {
                $actions = [];
                foreach ($chorusActions as $actionName => $actionConfig) {
                    $action = $model->getChorusAction($actionName);
                    if ($action) {
                        $actions[$actionName] = [
                            'name' => $actionName,
                            'config' => $action->getConfig(),
                            'rules' => $action->rules(),
                            'allowsOfflineWrites' => $action->allowsOfflineWrites(),
                            'supportsBatch' => $action->supportsBatch(),
                        ];
                    }
                }

                $allActions[$tableName] = [
                    'model' => $modelClass,
                    'table' => $tableName,
                    'actions' => $actions,
                ];
            }
        }

        return $allActions;
    }

    /**
     * Get chorus actions for a specific table
     */
    public static function getActionsForTable(string $tableName): ?array
    {
        $allActions = self::getAllActions();

        return $allActions[$tableName] ?? null;
    }
}
