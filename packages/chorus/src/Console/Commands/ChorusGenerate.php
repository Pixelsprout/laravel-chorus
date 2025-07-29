<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use ReflectionClass;
use Symfony\Component\Finder\Finder;

class ChorusGenerate extends Command
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
        $this->info('Generating IndexedDB schema from Harmonics models...');

        // Get all models
        $models = $this->getModels();
        $this->info('Found ' . count($models) . ' models to scan');

        // Filter models with Harmonics trait
        $harmonicsModels = $this->filterHarmonicsModels($models);
        $this->info('Found ' . count($harmonicsModels) . ' models with Harmonics trait');

        if (count($harmonicsModels) === 0) {
            $this->warn('No models with Harmonics trait found. Schema generation aborted.');
            return 1;
        }

        // Generate schema
        $schema = $this->generateSchema($harmonicsModels);
        
        // Generate TypeScript interfaces
        $interfaces = $this->generateInterfaces($harmonicsModels);
        
        // Save schema file
        $this->saveSchema($schema);
        
        // Save types file
        $this->saveTypes($interfaces);

        $this->info('Schema generation complete!');
        
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
            $this->warn("Models directory not found at {$modelDirectory}");
            return $models;
        }
        
        $finder = new Finder();
        $finder->files()->in($modelDirectory)->name('*.php');
        
        foreach ($finder as $file) {
            $className = $appNamespace . 'Models\\' . str_replace(['/', '.php'], ['\\', ''], $file->getRelativePathname());
            
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
            } catch (\Exception $e) {
                $this->warn("Error analyzing model {$model}: " . $e->getMessage());
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
                $fields = implode(', ', array_filter($syncFields, fn($field) => $field !== $primaryKey));
                $schema[$tableName] = $primaryKey . ($fields ? ', ' . $fields : '');
                
                $this->info("Added schema for table {$tableName}");
            } catch (\Exception $e) {
                $this->warn("Error generating schema for {$modelClass}: " . $e->getMessage());
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
                
                $this->info("Added interface for {$modelName}");
            } catch (\Exception $e) {
                $this->warn("Error generating interface for {$modelClass}: " . $e->getMessage());
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
        $content .= "// Generated on " . now()->toDateTimeString() . "\n\n";
        $content .= "export const chorusSchema: Record<string, string> = {\n";
        
        foreach ($schema as $table => $fields) {
            $content .= "  '{$table}': '{$fields}',\n";
        }
        
        $content .= "};\n";
        
        // Save file
        File::put("{$directory}/schema.ts", $content);
        
        $this->info("Schema saved to {$directory}/schema.ts");
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
        $content .= "// Generated on " . now()->toDateTimeString() . "\n\n";
        
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
        
        $this->info("Types saved to {$directory}/types.ts");
    }
}