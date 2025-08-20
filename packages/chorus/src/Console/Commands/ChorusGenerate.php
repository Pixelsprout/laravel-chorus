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
     * Convert Laravel validation rules to TypeScript types with detailed constraints
     */
    protected function convertRulesToTypeScript(array $rules): array
    {
        $parameters = [];

        foreach ($rules as $field => $rule) {
            $ruleArray = is_array($rule) ? $rule : explode('|', $rule);
            $ruleString = is_array($rule) ? implode('|', $rule) : $rule;

            $constraints = $this->extractValidationConstraints($ruleArray);

            $isOptional = $constraints['nullable'] || $constraints['sometimes'] || str_contains($ruleString, 'nullable') || str_contains($ruleString, 'sometimes');
            $isRequired = ! $isOptional && ($constraints['required'] || str_contains($ruleString, 'required'));

            // Determine TypeScript type
            $type = $this->determineTypeScriptType($constraints, $ruleString);

            $parameters[$field] = [
                'type' => $type,
                'optional' => $isOptional,
                'required' => $isRequired,
                'rules' => $ruleString,
                'constraints' => $constraints,
            ];
        }

        return $parameters;
    }

    /**
     * Extract detailed validation constraints from rule array
     */
    protected function extractValidationConstraints(array $rules): array
    {
        $constraints = [
            'required' => false,
            'nullable' => false,
            'sometimes' => false,
            'string' => false,
            'integer' => false,
            'numeric' => false,
            'boolean' => false,
            'array' => false,
            'uuid' => false,
            'email' => false,
            'url' => false,
            'date' => false,
            'min' => null,
            'max' => null,
            'min_digits' => null,
            'max_digits' => null,
            'regex' => null,
            'in' => [],
            'exists' => null,
            'unique' => null,
        ];

        foreach ($rules as $rule) {
            $rule = mb_trim($rule);

            // Basic type rules
            if ($rule === 'required') {
                $constraints['required'] = true;
            } elseif ($rule === 'nullable') {
                $constraints['nullable'] = true;
            } elseif ($rule === 'sometimes') {
                $constraints['sometimes'] = true;
            } elseif ($rule === 'string') {
                $constraints['string'] = true;
            } elseif ($rule === 'integer') {
                $constraints['integer'] = true;
            } elseif ($rule === 'numeric') {
                $constraints['numeric'] = true;
            } elseif ($rule === 'boolean') {
                $constraints['boolean'] = true;
            } elseif ($rule === 'array') {
                $constraints['array'] = true;
            } elseif ($rule === 'uuid') {
                $constraints['uuid'] = true;
            } elseif ($rule === 'email') {
                $constraints['email'] = true;
            } elseif ($rule === 'url') {
                $constraints['url'] = true;
            } elseif ($rule === 'date') {
                $constraints['date'] = true;
            }

            // Parameterized rules
            elseif (str_starts_with($rule, 'min:')) {
                $constraints['min'] = (int) mb_substr($rule, 4);
            } elseif (str_starts_with($rule, 'max:')) {
                $constraints['max'] = (int) mb_substr($rule, 4);
            } elseif (str_starts_with($rule, 'min_digits:')) {
                $constraints['min_digits'] = (int) mb_substr($rule, 11);
            } elseif (str_starts_with($rule, 'max_digits:')) {
                $constraints['max_digits'] = (int) mb_substr($rule, 11);
            } elseif (str_starts_with($rule, 'regex:')) {
                $constraints['regex'] = mb_substr($rule, 6);
            } elseif (str_starts_with($rule, 'in:')) {
                $values = explode(',', mb_substr($rule, 3));
                $constraints['in'] = array_map('trim', $values);
            } elseif (str_starts_with($rule, 'exists:')) {
                $constraints['exists'] = mb_substr($rule, 7);
            } elseif (str_starts_with($rule, 'unique:')) {
                $constraints['unique'] = mb_substr($rule, 7);
            }
        }

        return $constraints;
    }

    /**
     * Determine the appropriate TypeScript type based on constraints
     */
    protected function determineTypeScriptType(array $constraints, string $ruleString): string
    {
        // Handle union types for 'in' constraints
        if (! empty($constraints['in'])) {
            $values = array_map(function ($value) {
                return is_numeric($value) ? $value : "'{$value}'";
            }, $constraints['in']);

            return implode(' | ', $values);
        }

        // Primary type determination
        if ($constraints['boolean']) {
            return 'boolean';
        }
        if ($constraints['array']) {
            return 'any[]';
        }
        if ($constraints['integer'] || $constraints['numeric']) {
            return 'number';
        }
        if ($constraints['string'] || $constraints['uuid'] || $constraints['email'] || $constraints['url']) {
            return 'string';
        }
        if ($constraints['date']) {
            return 'string';
        } // ISO date string

        // Default fallback
        return 'any';
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

        // Generate validation utilities
        $content .= $this->generateValidationUtilities();

        // Generate parameter interfaces with validation
        foreach ($actionInterfaces as $actionName => $actionData) {
            $content .= "export interface {$actionName}Params {\n";

            foreach ($actionData['parameters'] as $field => $paramData) {
                $optional = $paramData['optional'] ? '?' : '';
                // Quote field names that contain dots or special characters
                $fieldName = str_contains($field, '.') || str_contains($field, '-') || ! ctype_alnum(str_replace('_', '', $field))
                    ? "'{$field}'"
                    : $field;
                $content .= "  {$fieldName}{$optional}: {$paramData['type']};\n";
            }

            $content .= "}\n\n";

            // Generate validation schema for this action
            $content .= $this->generateValidationSchema($actionName, $actionData);
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
        $content .= "  validation_errors?: ValidationError[];\n";
        $content .= "}\n\n";

        // Generate model proxy interfaces
        $content .= "export interface ModelProxy {\n";
        $content .= "  create(data: Record<string, any>): void;\n";
        $content .= "  update(data: Record<string, any>): void;\n";
        $content .= "  remove(data: Record<string, any>): void;\n";
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
        $implContent .= "import { getGlobalChorusActionsAPI } from '@pixelsprout/chorus-js/core';\n";
        $implContent .= "import type { ChorusActionResponse, WritesProxy, ModelProxy, ValidationUtils, ValidationResult } from './actions';\n";
        $implContent .= 'import { ';

        // Import validation schemas as values (not types)
        $schemaImports = [];
        foreach ($actionInterfaces as $actionName => $actionData) {
            $schemaImports[] = "{$actionName}ValidationSchema";
        }
        $implContent .= implode(', ', $schemaImports);

        $implContent .= " } from './actions';\n\n";

        $implContent .= "// Use the global ChorusActionsAPI instance for optimistic updates integration\n";
        $implContent .= "const chorusAPI = getGlobalChorusActionsAPI();\n\n";

        // Generate implementation for each action function
        foreach ($actionInterfaces as $actionName => $actionData) {
            $functionName = lcfirst($actionName).'Action';
            $routeName = $this->convertToKebabCase($actionName);

            $implContent .= "export async function {$functionName}(\n";
            $implContent .= "  callback: (writes: WritesProxy) => any,\n";
            $implContent .= "  options: { validate?: boolean } = { validate: true }\n";
            $implContent .= "): Promise<ChorusActionResponse> {\n";
            $implContent .= "  return await chorusAPI.executeActionWithCallback(\n";
            $implContent .= "    '{$routeName}',\n";
            $implContent .= "    callback,\n";
            $implContent .= "    {\n";
            $implContent .= "      optimistic: true,\n";
            $implContent .= "      offline: true,\n";
            $implContent .= "      validate: options.validate,\n";
            $implContent .= "      validationSchema: options.validate ? {$actionName}ValidationSchema : undefined,\n";
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
     * Generate validation utilities TypeScript code
     */
    protected function generateValidationUtilities(): string
    {
        return "// Validation utilities\n".
               "export interface ValidationError {\n".
               "  field: string;\n".
               "  message: string;\n".
               "  rule: string;\n".
               "  value?: any;\n".
               "}\n\n".

               "export interface ValidationResult {\n".
               "  valid: boolean;\n".
               "  errors: ValidationError[];\n".
               "}\n\n".

               "export interface FieldConstraints {\n".
               "  required?: boolean;\n".
               "  type?: string;\n".
               "  min?: number;\n".
               "  max?: number;\n".
               "  minDigits?: number;\n".
               "  maxDigits?: number;\n".
               "  regex?: string;\n".
               "  in?: any[];\n".
               "  uuid?: boolean;\n".
               "  email?: boolean;\n".
               "  url?: boolean;\n".
               "  date?: boolean;\n".
               "}\n\n".

               "export interface ValidationSchema {\n".
               "  [field: string]: FieldConstraints;\n".
               "}\n\n".

               "// Core validation functions\n".
               "export const ValidationUtils = {\n".
               "  validateField(value: any, constraints: FieldConstraints, fieldName: string): ValidationError[] {\n".
               "    const errors: ValidationError[] = [];\n\n".

               "    // Required check\n".
               "    if (constraints.required && (value === null || value === undefined || value === '')) {\n".
               "      errors.push({ field: fieldName, message: `\${fieldName} is required`, rule: 'required', value });\n".
               "      return errors; // Stop further validation if required field is missing\n".
               "    }\n\n".

               "    // Skip other validations if value is empty and not required\n".
               "    if (!constraints.required && (value === null || value === undefined || value === '')) {\n".
               "      return errors;\n".
               "    }\n\n".

               "    // Type validation\n".
               "    if (constraints.type) {\n".
               "      if (constraints.type === 'string' && typeof value !== 'string') {\n".
               "        errors.push({ field: fieldName, message: `\${fieldName} must be a string`, rule: 'string', value });\n".
               "      } else if (constraints.type === 'number' && typeof value !== 'number') {\n".
               "        errors.push({ field: fieldName, message: `\${fieldName} must be a number`, rule: 'number', value });\n".
               "      } else if (constraints.type === 'boolean' && typeof value !== 'boolean') {\n".
               "        errors.push({ field: fieldName, message: `\${fieldName} must be a boolean`, rule: 'boolean', value });\n".
               "      }\n".
               "    }\n\n".

               "    // String-specific validations\n".
               "    if (typeof value === 'string') {\n".
               "      if (constraints.min !== undefined && value.length < constraints.min) {\n".
               "        errors.push({ field: fieldName, message: `\${fieldName} must be at least \${constraints.min} characters`, rule: 'min', value });\n".
               "      }\n".
               "      if (constraints.max !== undefined && value.length > constraints.max) {\n".
               "        errors.push({ field: fieldName, message: `\${fieldName} may not be greater than \${constraints.max} characters`, rule: 'max', value });\n".
               "      }\n".
               "      if (constraints.regex && !new RegExp(constraints.regex).test(value)) {\n".
               "        errors.push({ field: fieldName, message: `\${fieldName} format is invalid`, rule: 'regex', value });\n".
               "      }\n".
               "      if (constraints.uuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {\n".
               "        errors.push({ field: fieldName, message: `\${fieldName} must be a valid UUID`, rule: 'uuid', value });\n".
               "      }\n".
               "      if (constraints.email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) {\n".
               "        errors.push({ field: fieldName, message: `\${fieldName} must be a valid email address`, rule: 'email', value });\n".
               "      }\n".
               "      if (constraints.url && !/^https?:\\/\\/.+/.test(value)) {\n".
               "        errors.push({ field: fieldName, message: `\${fieldName} must be a valid URL`, rule: 'url', value });\n".
               "      }\n".
               "    }\n\n".

               "    // Number-specific validations\n".
               "    if (typeof value === 'number') {\n".
               "      if (constraints.min !== undefined && value < constraints.min) {\n".
               "        errors.push({ field: fieldName, message: `\${fieldName} must be at least \${constraints.min}`, rule: 'min', value });\n".
               "      }\n".
               "      if (constraints.max !== undefined && value > constraints.max) {\n".
               "        errors.push({ field: fieldName, message: `\${fieldName} may not be greater than \${constraints.max}`, rule: 'max', value });\n".
               "      }\n".
               "    }\n\n".

               "    // In validation\n".
               "    if (constraints.in && constraints.in.length > 0 && !constraints.in.includes(value)) {\n".
               "      errors.push({ field: fieldName, message: `\${fieldName} must be one of: \${constraints.in.join(', ')}`, rule: 'in', value });\n".
               "    }\n\n".

               "    return errors;\n".
               "  },\n\n".

               "  validateObject(data: Record<string, any>, schema: ValidationSchema): ValidationResult {\n".
               "    const errors: ValidationError[] = [];\n\n".

               "    for (const [fieldName, constraints] of Object.entries(schema)) {\n".
               "      const fieldErrors = this.validateField(data[fieldName], constraints, fieldName);\n".
               "      errors.push(...fieldErrors);\n".
               "    }\n\n".

               "    return {\n".
               "      valid: errors.length === 0,\n".
               "      errors\n".
               "    };\n".
               "  }\n".
               "};\n\n";
    }

    /**
     * Generate validation schema for a specific action
     */
    protected function generateValidationSchema(string $actionName, array $actionData): string
    {
        $content = "// Validation schema for {$actionName}\n";
        $content .= "export const {$actionName}ValidationSchema: Record<string, ValidationSchema> = {\n";

        foreach ($actionData['rules'] as $operationKey => $rules) {
            // Skip the 'data' key as it's handled separately
            if ($operationKey === 'data') {
                continue;
            }

            // Handle flat rules structure (legacy format)
            if (! str_contains($operationKey, '.')) {
                // This is a flat rule structure, we need to create a virtual operation
                $content .= "  'default': {\n";

                // Process each rule in the flat structure
                foreach ($actionData['rules'] as $field => $rule) {
                    if ($field === 'data') {
                        continue;
                    } // Skip data field

                    $ruleArray = is_array($rule) ? $rule : explode('|', $rule);
                    $constraints = $this->extractValidationConstraints($ruleArray);

                    $content .= "    '{$field}': {\n";

                    if ($constraints['required']) {
                        $content .= "      required: true,\n";
                    }
                    if ($constraints['string']) {
                        $content .= "      type: 'string',\n";
                    }
                    if ($constraints['integer']) {
                        $content .= "      type: 'number',\n";
                    }
                    if ($constraints['numeric']) {
                        $content .= "      type: 'number',\n";
                    }
                    if ($constraints['boolean']) {
                        $content .= "      type: 'boolean',\n";
                    }
                    if ($constraints['min'] !== null) {
                        $content .= "      min: {$constraints['min']},\n";
                    }
                    if ($constraints['max'] !== null) {
                        $content .= "      max: {$constraints['max']},\n";
                    }
                    if ($constraints['uuid']) {
                        $content .= "      uuid: true,\n";
                    }
                    if ($constraints['email']) {
                        $content .= "      email: true,\n";
                    }
                    if ($constraints['url']) {
                        $content .= "      url: true,\n";
                    }
                    if ($constraints['date']) {
                        $content .= "      date: true,\n";
                    }
                    if (! empty($constraints['in'])) {
                        $inValues = implode(', ', array_map(function ($val) {
                            return is_numeric($val) ? $val : "'{$val}'";
                        }, $constraints['in']));
                        $content .= "      in: [{$inValues}],\n";
                    }
                    if ($constraints['regex'] !== null) {
                        $escapedRegex = addslashes($constraints['regex']);
                        $content .= "      regex: '{$escapedRegex}',\n";
                    }

                    $content .= "    },\n";
                }

                $content .= "  },\n";
                break; // Exit the loop since we've processed all flat rules
            }

            // Handle nested rules structure (new format)
            if (is_array($rules)) {
                $content .= "  '{$operationKey}': {\n";

                foreach ($rules as $field => $rule) {
                    $ruleArray = is_array($rule) ? $rule : explode('|', $rule);
                    $constraints = $this->extractValidationConstraints($ruleArray);

                    $content .= "    '{$field}': {\n";

                    if ($constraints['required']) {
                        $content .= "      required: true,\n";
                    }
                    if ($constraints['string']) {
                        $content .= "      type: 'string',\n";
                    }
                    if ($constraints['integer']) {
                        $content .= "      type: 'number',\n";
                    }
                    if ($constraints['numeric']) {
                        $content .= "      type: 'number',\n";
                    }
                    if ($constraints['boolean']) {
                        $content .= "      type: 'boolean',\n";
                    }
                    if ($constraints['min'] !== null) {
                        $content .= "      min: {$constraints['min']},\n";
                    }
                    if ($constraints['max'] !== null) {
                        $content .= "      max: {$constraints['max']},\n";
                    }
                    if ($constraints['uuid']) {
                        $content .= "      uuid: true,\n";
                    }
                    if ($constraints['email']) {
                        $content .= "      email: true,\n";
                    }
                    if ($constraints['url']) {
                        $content .= "      url: true,\n";
                    }
                    if ($constraints['date']) {
                        $content .= "      date: true,\n";
                    }
                    if (! empty($constraints['in'])) {
                        $inValues = implode(', ', array_map(function ($val) {
                            return is_numeric($val) ? $val : "'{$val}'";
                        }, $constraints['in']));
                        $content .= "      in: [{$inValues}],\n";
                    }
                    if ($constraints['regex'] !== null) {
                        $escapedRegex = addslashes($constraints['regex']);
                        $content .= "      regex: '{$escapedRegex}',\n";
                    }

                    $content .= "    },\n";
                }

                $content .= "  },\n";
            }
        }

        // Add data validation schema if it exists
        if (isset($actionData['rules']['data'])) {
            $content .= "  'data': {\n";

            foreach ($actionData['rules']['data'] as $field => $rule) {
                $ruleArray = is_array($rule) ? $rule : explode('|', $rule);
                $constraints = $this->extractValidationConstraints($ruleArray);

                $content .= "    '{$field}': {\n";

                if ($constraints['required']) {
                    $content .= "      required: true,\n";
                }
                if ($constraints['string']) {
                    $content .= "      type: 'string',\n";
                }
                if ($constraints['integer']) {
                    $content .= "      type: 'number',\n";
                }
                if ($constraints['numeric']) {
                    $content .= "      type: 'number',\n";
                }
                if ($constraints['boolean']) {
                    $content .= "      type: 'boolean',\n";
                }
                if ($constraints['min'] !== null) {
                    $content .= "      min: {$constraints['min']},\n";
                }
                if ($constraints['max'] !== null) {
                    $content .= "      max: {$constraints['max']},\n";
                }
                if ($constraints['uuid']) {
                    $content .= "      uuid: true,\n";
                }
                if ($constraints['email']) {
                    $content .= "      email: true,\n";
                }
                if ($constraints['url']) {
                    $content .= "      url: true,\n";
                }

                $content .= "    },\n";
            }

            $content .= "  },\n";
        }

        $content .= "};\n\n";

        return $content;
    }

    /**
     * Convert PascalCase to kebab-case
     */
    protected function convertToKebabCase(string $string): string
    {
        return mb_strtolower(preg_replace('/(?<!^)[A-Z]/', '-$0', $string));
    }
}
