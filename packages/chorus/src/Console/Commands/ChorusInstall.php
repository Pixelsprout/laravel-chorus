<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Console\Commands;

use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use function Laravel\Prompts\confirm;
use function Laravel\Prompts\error;
use function Laravel\Prompts\text;
use function Laravel\Prompts\info;
use function Laravel\Prompts\warning;

final class ChorusInstall extends Command
{
    protected $signature = 'chorus:install';

    protected $description = 'Install and set up Laravel Chorus with Reverb for WebSocket broadcasting';

    public function handle(): void
    {
        info('Installing Laravel Chorus...');

        // Step 1: Publish migrations, config, and channels
        $this->call('chorus:publish');

        // Step 2: Check and setup Reverb
        $this->setupReverb();

        // Step 3: Configure broadcasting
        $this->configureBroadcasting();

        // Step 4: Install chorus-js node module
        $this->installChorusJS();

        // Step 5: Create _generated directory with default schema
        $this->createGeneratedDirectory();

        info('Laravel Chorus has been installed successfully!');
        info('Next steps:');
        info('1. Run the migrations with: php artisan migrate');
        info('2. Generate IndexedDB schema with: php artisan chorus:generate');
        info('3. Start the Chorus server with: php artisan chorus:start');
        info("4. Install the @chorus/js package once it's published to npm");
        info('5. Configure your frontend to use the Chorus JavaScript client');
    }

    private function setupReverb(): void
    {
        info('Setting up broadcasting for Laravel Chorus...');

        // Check if Reverb is already installed and configured
        if (File::exists(config_path('reverb.php')) && $this->isReverbConfigured()) {
            info('Reverb is already installed and configured.');

            // Check if the reverb driver is configured
            $envFile = base_path('.env');
            if (File::exists($envFile)) {
                $env = File::get($envFile);
                if (! preg_match('/BROADCAST_DRIVER=reverb/', $env)) {
                    info(
                        'Note: For the best experience with Chorus, we recommend using the "reverb" driver.'
                    );
                    info(
                        'You can change this in your .env file: BROADCAST_DRIVER=reverb'
                    );
                }
            }

            return;
        }

        // Use Laravel's built-in broadcasting installation command

        $setupReverb = confirm(
            label: 'Would you like to set up broadcasting with Reverb?',
            default: true,
            hint: 'Chorus uses reverb to communicate change events with connected clients.'
        );


        if ($setupReverb) {
            // Run the Laravel broadcasting installer
            $this->call('install:broadcasting');

            // Check if the reverb driver was selected
            $envFile = base_path('.env');
            if (File::exists($envFile)) {
                $env = File::get($envFile);
                if (! preg_match('/BROADCAST_DRIVER=reverb/', $env)) {
                    info(
                        'Note: For the best experience with Chorus, we recommend using the "reverb" driver.'
                    );
                    info(
                        'You can change this in your .env file: BROADCAST_DRIVER=reverb'
                    );
                }
            }
        } else {
            warning(
                'Skipping broadcasting setup. You will need to set up broadcasting manually to use Chorus\'s real-time features.'
            );
        }
    }

    private function configureBroadcasting(): void
    {
        // Check if BroadcastServiceProvider is enabled
        if (File::exists(config_path('app.php'))) {
            $appConfig = File::get(config_path('app.php'));

            if (
                preg_match(
                    "/\/\/\s*App\\\\Providers\\\\BroadcastServiceProvider::class/",
                    $appConfig
                )
            ) {
                info(
                    'BroadcastServiceProvider is commented out in your config/app.php file.'
                );

                if (
                    confirm(
                        label: 'Would you like to enable BroadcastServiceProvider now?',
                        default: true
                    )
                ) {
                    $appConfig = preg_replace(
                        "/\/\/\s*App\\\\Providers\\\\BroadcastServiceProvider::class/",
                        'App\\Providers\\BroadcastServiceProvider::class',
                        $appConfig
                    );

                    File::put(config_path('app.php'), $appConfig);
                    info(
                        'BroadcastServiceProvider has been enabled in your config/app.php file.'
                    );
                }
            } elseif (
                preg_match(
                    '/App\\\\Providers\\\\BroadcastServiceProvider::class/',
                    $appConfig
                )
            ) {
                info('BroadcastServiceProvider is already enabled.');
            }
        }
    }

    private function createGeneratedDirectory(): void
    {
        // Create _generated directory
        $directory = resource_path('js/_generated');

        if (! File::exists($directory)) {
            File::makeDirectory($directory, 0755, true);
            info('Created directory: resources/js/_generated');
        }

        // Create default schema file
        $schemaPath = $directory.'/schema.ts';

        if (! File::exists($schemaPath)) {
            $content = <<<'TS'
// Default empty schema - run php artisan chorus:generate to populate this file
export const chorusSchema: Record<string, string> = {
  // Schema will be auto-populated when you run php artisan chorus:generate
  // Example format:
  // 'users': 'id, name, email',
  // 'messages': 'id, user_id, content, created_at'
};
TS;

            File::put($schemaPath, $content);
            info(
                'Created default schema file: resources/js/_generated/schema.ts'
            );
        }
    }

    private function installChorusJS(): void
    {
        info('Installing chorus-js node module...');

        // Check if package.json exists
        $packageJsonPath = base_path('package.json');
        if (! File::exists($packageJsonPath)) {
            warning(
                "package.json not found. Skipping chorus-js installation. You'll need to install it manually when it's published to npm."
            );

            return;
        }

        // For now, we'll just show instructions since the package isn't published yet
        if (
            confirm(
                label: 'Would you like to install the chorus-js package?',
                default: true
            )
        ) {
            try {
                // Check which package manager is available
                $packageManager = $this->detectPackageManager();

                if ($packageManager) {
                    info("Detected package manager: {$packageManager}");

                    $this->runPackageManagerCommand($packageManager, ['install', '@pixelsprout/chorus-js']);
                    info('Successfully installed @chorus/js');

                } else {
                    warning(
                        "No package manager detected (npm, yarn, pnpm). Please install chorus-js manually once it's published to npm."
                    );
                }
            } catch (Exception $e) {
                error('Failed to install chorus-js: '.$e->getMessage());
                info(
                    "You can install it manually once it's published with: npm install @chorus/js"
                );
            }
        } else {
            info(
                'Skipped chorus-js installation. You can install it manually once published with: npm install @chorus/js'
            );
        }
    }

    private function detectPackageManager(): ?string
    {
        // Check for lock files to determine package manager
        if (File::exists(base_path('pnpm-lock.yaml'))) {
            return 'pnpm';
        }

        if (File::exists(base_path('yarn.lock'))) {
            return 'yarn';
        }

        if (File::exists(base_path('package-lock.json'))) {
            return 'npm';
        }

        // Fallback: check if commands are available
        try {
            $result = Process::run('which pnpm');
            if ($result->successful()) {
                return 'pnpm';
            }
        } catch (Exception $e) {
            // Continue to next check
        }

        try {
            $result = Process::run('which yarn');
            if ($result->successful()) {
                return 'yarn';
            }
        } catch (Exception $e) {
            // Continue to next check
        }

        try {
            $result = Process::run('which npm');
            if ($result->successful()) {
                return 'npm';
            }
        } catch (Exception $e) {
            // No package manager found
        }

        return null;
    }

    private function runPackageManagerCommand(string $packageManager, array $args): void
    {
        $command = $packageManager.' '.implode(' ', $args);
        info("Running: {$command}");

        $result = Process::path(base_path())->run($command);

        if ($result->successful()) {
            info("Successfully ran: {$command}");
            if ($result->output()) {
                $this->line($result->output());
            }
        } else {
            error("Failed to run: {$command}");
            if ($result->errorOutput()) {
                error($result->errorOutput());
            }
            throw new Exception('Package manager command failed');
        }
    }

    private function isReverbConfigured(): bool
    {
        $envFile = base_path('.env');

        if (! File::exists($envFile)) {
            return false;
        }

        $env = File::get($envFile);

        // Check if REVERB_APP_ID is present and has a value
        return preg_match('/REVERB_APP_ID=.+/', $env) === 1;
    }
}
