<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Traits;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Pixelsprout\LaravelChorus\Adapters\HarmonicSourceAdapterManager;
use Pixelsprout\LaravelChorus\Support\JSType;
use Pixelsprout\LaravelChorus\Support\Prefix;

trait Harmonics
{
    use HasUuids;

    public static function bootHarmonics(): void
    {
        $manager = app(HarmonicSourceAdapterManager::class);
        $manager->startTracking(static::class);
    }

    public function getSyncFields(): array
    {
        $syncFields = [];

        if (
            property_exists($this, 'syncFields') &&
            is_array($this->syncFields)
        ) {
            $syncFields = $this->syncFields;
        } elseif (method_exists($this, 'syncFields')) {
            $syncFields = $this->syncFields();
        }

        // Handle both array and associative array formats
        if (array_is_list($syncFields)) {
            // Simple array format: ['id', 'name', 'email']
            $fields = $syncFields;
        } else {
            // Associative array format: ['id' => JSType::String, 'name' => JSType::String]
            $fields = array_keys($syncFields);
        }

        $primaryKey = $this->getKeyName();
        if (! in_array($primaryKey, $fields)) {
            array_unshift($fields, $primaryKey);
        }

        return $fields;
    }

    public function getSyncFieldTypes(): array
    {
        $syncFields = [];

        if (
            property_exists($this, 'syncFields') &&
            is_array($this->syncFields)
        ) {
            $syncFields = $this->syncFields;
        } elseif (method_exists($this, 'syncFields')) {
            $syncFields = $this->syncFields();
        }

        $fieldTypes = [];

        if (array_is_list($syncFields)) {
            // Simple array format - default all to 'any'
            foreach ($syncFields as $field) {
                $fieldTypes[$field] = JSType::Any;
            }
        } else {
            // Associative array format with types
            $fieldTypes = $syncFields;
        }

        // Ensure primary key is included
        $primaryKey = $this->getKeyName();
        if (! isset($fieldTypes[$primaryKey])) {
            $fieldTypes[$primaryKey] = JSType::Any;
        }

        return $fieldTypes;
    }

    public function getSyncFilter()
    {
        if (method_exists($this, 'syncFilter')) {
            return $this->syncFilter();
        }

        return null;
    }

    public function getChorusChannelName(string $userId): string
    {
        $prefix = Prefix::resolve($this);

        $user = User::find($userId);

        if (! $user) {
            return '';
        }

        if (empty($prefix)) {
            return "chorus.user.{$user->getAuthIdentifier()}";
        }

        return "chorus.$prefix.user.{$user->getAuthIdentifier()}";
    }

    /**
     * Get chorus actions defined for this model
     */
    public function getChorusActions(): array
    {
        $chorusActions = [];

        if (property_exists($this, 'chorusActions') && is_array($this->chorusActions)) {
            $chorusActions = $this->chorusActions;
        } elseif (method_exists($this, 'chorusActions')) {
            $chorusActions = $this->chorusActions();
        }

        return $chorusActions;
    }

    /**
     * Get a specific chorus action by name
     */
    public function getChorusAction(string $actionName): ?object
    {
        $actions = $this->getChorusActions();

        foreach ($actions as $name => $actionConfig) {
            if ($name === $actionName) {
                if (is_string($actionConfig)) {
                    // Simple class name
                    return app($actionConfig);
                }
                if (is_array($actionConfig) && isset($actionConfig[0])) {
                    // [ClassName, options] format
                    $actionClass = $actionConfig[0];
                    $options = $actionConfig[1] ?? [];

                    $action = app($actionClass);
                    if (method_exists($action, 'setConfig')) {
                        $action->setConfig($options);
                    }

                    return $action;
                }
            }
        }

        return null;
    }

    /**
     * Get the table name for routing purposes
     */
    public function getChorusTableName(): string
    {
        return $this->getTable();
    }
}
