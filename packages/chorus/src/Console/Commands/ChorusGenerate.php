<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Console\Commands;

use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use ReflectionClass;
use Symfony\Component\Finder\Finder;

use function Laravel\Prompts\error;
use function Laravel\Prompts\info;
use function Laravel\Prompts\warning;

final class ChorusGenerate extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'chorus:generate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate IndexedDB schema from models using the Harmonics trait';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        info('Generating IndexedDB schema from Harmonics models...');

        // Get all models
        $models = $this->getModels();
        info('Found '.count($models).' models to scan');

        // Filter models with Harmonics trait
        $harmonicsModels = $this->filterHarmonicsModels($models);
        info('Found '.count($harmonicsModels).' models with Harmonics trait');

        if (count($harmonicsModels) === 0) {
            warning('No models with Harmonics trait found. Schema generation aborted.');

            return 1;
        }

        // Generate schema
        $schema = $this->generateSchema($harmonicsModels);

        // Generate TypeScript interfaces
        $interfaces = $this->generateInterfaces($harmonicsModels);

        // Generate ChorusAction interfaces
        $actionInterfaces = $this->generateActionInterfaces();

        // Save schema file
        $this->saveSchema($schema);

        // Save types file
        $this->saveTypes($interfaces);

        // Save action interfaces file
        $this->saveActionInterfaces($actionInterfaces);

        info('Schema generation complete!');

        return 0;
    }

    /**
     * Get all model classes in the application
     */
    protected function getModels(): array
    {
        $models = [];

        // Get application namespace from composer.json
        $appNamespace = app()->getNamespace();

        // Get all PHP files in the application's Models directory
        $modelDirectory = app_path('Models');

        if (! File::exists($modelDirectory)) {
            warning("Models directory not found at {$modelDirectory}");

            return $models;
        }

        $finder = new Finder();
        $finder->files()->in($modelDirectory)->name('*.php');

        foreach ($finder as $file) {
            $className = $appNamespace.'Models\\'.str_replace(['/', '.php'], ['\\', ''], $file->getRelativePathname());

            // Only add if it's a class that exists
            if (class_exists($className)) {
                $models[] = $className;
            }
        }

        return $models;
    }

    /**
     * Filter models that use the Harmonics trait
     */
    protected function filterHarmonicsModels(array $models): array
    {
        $harmonicsModels = [];
        $traitName = 'Pixelsprout\\LaravelChorus\\Traits\\Harmonics';

        foreach ($models as $model) {
            try {
                $reflection = new ReflectionClass($model);

                // Check if the model uses the Harmonics trait
                $traits = $this->getClassTraits($reflection);

                if (in_array($traitName, $traits)) {
                    $harmonicsModels[] = $model;
                }
            } catch (Exception $e) {
                warning("Error analyzing model {$model}: ".$e->getMessage());
            }
        }

        return $harmonicsModels;
    }

    /**
     * Get all traits used by a class, including traits used by parent classes
     */
    protected function getClassTraits(ReflectionClass $reflection): array
    {
        $traits = [];

        // Get traits of the current class
        $traits = array_merge($traits, array_keys($reflection->getTraits()));

        // Also get traits from all parent classes
        $parent = $reflection->getParentClass();
        if ($parent) {
            $traits = array_merge($traits, $this->getClassTraits($parent));
        }

        return $traits;
    }

    /**
     * Generate schema from Harmonics models
     */
    protected function generateSchema(array $harmonicsModels): array
    {
        $schema = [];

        foreach ($harmonicsModels as $modelClass) {
            try {
                $model = new $modelClass();
                $tableName = $model->getTable();
                $syncFields = $model->getSyncFields();

                // For IndexedDB, we'll use the primary key as the keyPath
                $primaryKey = $model->getKeyName();

                // Create IndexedDB table schema
                // Format: tableName: 'primaryKey, field1, field2, ...'
                $fields = implode(', ', array_filter($syncFields, fn ($field) => $field !== $primaryKey));
                $schema[$tableName] = $primaryKey.($fields ? ', '.$fields : '');

                info("Added schema for table {$tableName}");
            } catch (Exception $e) {
                warning("Error generating schema for {$modelClass}: ".$e->getMessage());
            }
        }

        return $schema;
    }

    /**
     * Generate TypeScript interfaces from Harmonics models
     */
    protected function generateInterfaces(array $harmonicsModels): array
    {
        $interfaces = [];

        foreach ($harmonicsModels as $modelClass) {
            try {
                $model = new $modelClass();
                $modelName = class_basename($modelClass);
                $fieldTypes = $model->getSyncFieldTypes();

                $interfaces[$modelName] = $fieldTypes;

                info("Added interface for {$modelName}");
            } catch (Exception $e) {
                error("Error generating interface for {$modelClass}: ".$e->getMessage());
            }
        }

        return $interfaces;
    }

    /**
     * Save schema to file
     */
    protected function saveSchema(array $schema): void
    {
        // Directory path
        $directory = resource_path('js/_generated');

        // Create directory if it doesn't exist
        if (! File::exists($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        // Create schema.ts file
        $content = "// Auto-generated IndexedDB schema for Chorus tables\n";
        $content .= '// Generated on '.now()->toDateTimeString()."\n\n";
        $content .= "export const chorusSchema: Record<string, string> = {\n";

        foreach ($schema as $table => $fields) {
            $content .= "  '{$table}': '{$fields}',\n";
        }

        $content .= "};\n";

        // Save file
        File::put("{$directory}/schema.ts", $content);

        info("Schema saved to {$directory}/schema.ts");
    }

    /**
     * Save TypeScript interfaces to file
     */
    protected function saveTypes(array $interfaces): void
    {
        // Directory path
        $directory = resource_path('js/_generated');

        // Create directory if it doesn't exist
        if (! File::exists($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        // Create types.ts file
        $content = "// Auto-generated TypeScript interfaces for Chorus models\n";
        $content .= '// Generated on '.now()->toDateTimeString()."\n\n";

        foreach ($interfaces as $modelName => $fieldTypes) {
            $content .= "export interface {$modelName} {\n";

            foreach ($fieldTypes as $field => $type) {
                $jsType = $type instanceof \Pixelsprout\LaravelChorus\Support\JSType ? $type->value : 'any';
                $content .= "  {$field}: {$jsType};\n";
            }

            $content .= "}\n\n";
        }

        // Save file
        File::put("{$directory}/types.ts", $content);

        info("Types saved to {$directory}/types.ts");
    }

    /**
     * Generate RPC-like interfaces for ChorusActions
     */
    protected function generateActionInterfaces(): array
    {
        $actionInterfaces = [];

        // Get all ChorusAction classes
        $actions = $this->getChorusActions();

        foreach ($actions as $actionClass) {
            try {
                $action = new $actionClass();
                $actionName = class_basename($actionClass);

                // Remove 'Action' suffix if it exists
                $interfaceName = str_replace('Action', '', $actionName);

                $rules = $action->rules();

                $actionInterfaces[$interfaceName] = [
                    'className' => $actionClass,
                    'rules' => $rules,
                    'parameters' => $this->convertRulesToTypeScript($rules),
                ];

                info("Added action interface for {$interfaceName}");
            } catch (Exception $e) {
                warning("Error generating action interface for {$actionClass}: ".$e->getMessage());
            }
        }

        return $actionInterfaces;
    }

    /**
     * Get all ChorusAction classes in the application
     */
    protected function getChorusActions(): array
    {
        $actions = [];
        $appNamespace = app()->getNamespace();

        // Check for ChorusActions directory
        $actionDirectory = app_path('Actions/ChorusActions');

        if (! File::exists($actionDirectory)) {
            warning("ChorusActions directory not found at {$actionDirectory}");

            return $actions;
        }

        $finder = new Finder();
        $finder->files()->in($actionDirectory)->name('*.php');

        foreach ($finder as $file) {
            $className = $appNamespace.'Actions\\ChorusActions\\'.str_replace(['/', '.php'], ['\\', ''], $file->getRelativePathname());

            if (class_exists($className)) {
                try {
                    $reflection = new ReflectionClass($className);

                    // Check if it extends ChorusAction
                    $parentClass = $reflection->getParentClass();
                    if ($parentClass && $parentClass->getName() === 'Pixelsprout\\LaravelChorus\\Support\\ChorusAction') {
                        $actions[] = $className;
                    }
                } catch (Exception $e) {
                    warning("Error analyzing action {$className}: ".$e->getMessage());
                }
            }
        }

        return $actions;
    }

    /**
     * Convert Laravel validation rules to TypeScript types
     */
    protected function convertRulesToTypeScript(array $rules): array
    {
        $parameters = [];

        foreach ($rules as $field => $rule) {
            $ruleString = is_array($rule) ? implode('|', $rule) : $rule;
            $isOptional = str_contains($ruleString, 'nullable') || str_contains($ruleString, 'sometimes');

            $type = 'any';
            if (str_contains($ruleString, 'string')) {
                $type = 'string';
            } elseif (str_contains($ruleString, 'integer') || str_contains($ruleString, 'numeric')) {
                $type = 'number';
            } elseif (str_contains($ruleString, 'boolean')) {
                $type = 'boolean';
            } elseif (str_contains($ruleString, 'array')) {
                $type = 'any[]';
            }

            $parameters[$field] = [
                'type' => $type,
                'optional' => $isOptional,
                'rules' => $ruleString,
            ];
        }

        return $parameters;
    }

    /**
     * Save action interfaces to file
     */
    protected function saveActionInterfaces(array $actionInterfaces): void
    {
        $directory = resource_path('js/_generated');

        if (! File::exists($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        $content = "// Auto-generated TypeScript interfaces for Chorus Actions\n";
        $content .= '// Generated on '.now()->toDateTimeString()."\n\n";

        // Generate parameter interfaces
        foreach ($actionInterfaces as $actionName => $actionData) {
            $content .= "export interface {$actionName}Params {\n";

            foreach ($actionData['parameters'] as $field => $paramData) {
                $optional = $paramData['optional'] ? '?' : '';
                $content .= "  {$field}{$optional}: {$paramData['type']};\n";
            }

            $content .= "}\n\n";
        }

        // Generate response interface
        $content .= "export interface ChorusActionResponse {\n";
        $content .= "  success: boolean;\n";
        $content .= "  operations?: {\n";
        $content .= "    success: boolean;\n";
        $content .= "    index: number;\n";
        $content .= "    operation: {\n";
        $content .= "      table: string;\n";
        $content .= "      operation: string;\n";
        $content .= "      data: any;\n";
        $content .= "    };\n";
        $content .= "    data?: any;\n";
        $content .= "    error?: string;\n";
        $content .= "  }[];\n";
        $content .= "  summary?: {\n";
        $content .= "    total: number;\n";
        $content .= "    successful: number;\n";
        $content .= "    failed: number;\n";
        $content .= "  };\n";
        $content .= "  error?: string;\n";
        $content .= "}\n\n";

        // Generate model proxy interfaces
        $content .= "export interface ModelProxy {\n";
        $content .= "  create(data: Record<string, any>): void;\n";
        $content .= "  update(data: Record<string, any>): void;\n";
        $content .= "  delete(data: Record<string, any>): void;\n";
        $content .= "}\n\n";

        $content .= "export interface WritesProxy {\n";
        $content .= "  messages: ModelProxy;\n";
        $content .= "  users: ModelProxy;\n";
        $content .= "  platforms: ModelProxy;\n";
        $content .= "  [tableName: string]: ModelProxy;\n";
        $content .= "}\n\n";

        // Generate callback-style action functions
        foreach ($actionInterfaces as $actionName => $actionData) {
            $functionName = lcfirst($actionName).'Action';
            $content .= "export declare function {$functionName}(\n";
            $content .= "  callback: (writes: WritesProxy) => void\n";
            $content .= "): Promise<ChorusActionResponse>;\n\n";
        }

        // Generate legacy interface for backwards compatibility
        $content .= "export interface ChorusActions {\n";
        foreach ($actionInterfaces as $actionName => $actionData) {
            $content .= "  {$actionName}(params: {$actionName}Params): Promise<ChorusActionResponse>;\n";
        }
        $content .= "}\n\n";

        // Generate action metadata
        $content .= "export const chorusActionMeta = {\n";
        foreach ($actionInterfaces as $actionName => $actionData) {
            // Escape backslashes for JavaScript strings
            $escapedClassName = addslashes($actionData['className']);
            $content .= "  {$actionName}: {\n";
            $content .= "    className: '{$escapedClassName}',\n";
            $content .= "    allowOfflineWrites: true,\n";
            $content .= "    supportsBatch: true,\n";
            $content .= "  },\n";
        }
        $content .= "};\n\n";

        // Generate the actual implementation file
        $implContent = "// Auto-generated implementation for Chorus Actions\n";
        $implContent .= '// Generated on '.now()->toDateTimeString()."\n\n";
        $implContent .= "import { ChorusActionsAPI } from '@pixelsprout/chorus-js/core';\n";
        $implContent .= "import type { ChorusActionResponse, WritesProxy, ModelProxy } from './actions';\n\n";

        $implContent .= "// Create the global ChorusActionsAPI instance\n";
        $implContent .= "const chorusAPI = new ChorusActionsAPI('/api');\n\n";

        // Generate implementation for each action function
        foreach ($actionInterfaces as $actionName => $actionData) {
            $functionName = lcfirst($actionName).'Action';
            $routeName = $this->convertToKebabCase($actionName);

            $implContent .= "export async function {$functionName}(\n";
            $implContent .= "  callback: (writes: WritesProxy) => void\n";
            $implContent .= "): Promise<ChorusActionResponse> {\n";
            $implContent .= "  return await chorusAPI.executeActionWithCallback(\n";
            $implContent .= "    '{$routeName}',\n";
            $implContent .= "    callback,\n";
            $implContent .= "    {\n";
            $implContent .= "      optimistic: true,\n";
            $implContent .= "      offline: true,\n";
            $implContent .= "    }\n";
            $implContent .= "  );\n";
            $implContent .= "}\n\n";
        }

        File::put("{$directory}/actions.ts", $content);
        File::put("{$directory}/chorus-actions.ts", $implContent);
        info("Action interfaces saved to {$directory}/actions.ts");
        info("Action implementations saved to {$directory}/chorus-actions.ts");
    }

    /**
     * Convert PascalCase to kebab-case
     */
    protected function convertToKebabCase(string $string): string
    {
        return mb_strtolower(preg_replace('/(?<!^)[A-Z]/', '-$0', $string));
    }
}
