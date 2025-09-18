<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Console\Commands;

use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

use function Laravel\Prompts\confirm;
use function Laravel\Prompts\error;
use function Laravel\Prompts\info;
use function Laravel\Prompts\select;
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
                if (! str_contains($env, 'BROADCAST_DRIVER=reverb')) {
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

        $setupReverb = confirm(
            label: 'Would you like to set up broadcasting with Reverb?',
            default: true,
            hint: 'Chorus uses reverb to communicate change events with connected clients.'
        );

        if ($setupReverb) {
            $this->call('install:broadcasting', ['--reverb' => true]);
        } else {
            warning(
                'Skipping broadcasting setup. You will need to set up broadcasting manually to use Chorus\'s real-time features.'
            );
        }
    }

    private function configureBroadcasting(): void
    {
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
        info('Installing Chorus client library...');

        // Check if package.json exists
        $packageJsonPath = base_path('package.json');
        if (! File::exists($packageJsonPath)) {
            warning(
                "package.json not found. Skipping client library installation. You'll need to install it manually when it's published to npm."
            );

            return;
        }

        // Prompt user to select frontend framework
        $framework = select(
            label: 'Which frontend framework will you be using?',
            options: [
                'react' => 'React',
                'vue' => 'Vue.js',
                'svelte' => 'Svelte',
                'vanilla' => 'Vanilla JavaScript',
            ],
            default: 'react'
        );

        // Map framework to package name
        $packageMap = [
            'react' => '@pixelsprout/chorus-react',
            'vue' => '@pixelsprout/chorus-vue',
            'svelte' => '@pixelsprout/chorus-svelte',
            'vanilla' => '@pixelsprout/chorus-react',
        ];

        $packageName = $packageMap[$framework];

        if (
            confirm(
                label: "Would you like to install the {$packageName} package?",
                default: true
            )
        ) {
            try {
                // Check which package manager is available
                $packageManager = $this->detectPackageManager();

                if ($packageManager) {
                    info("Detected package manager: {$packageManager}");

                    $this->runPackageManagerCommand($packageManager, ['install', $packageName]);
                    info("Successfully installed {$packageName}");

                } else {
                    warning(
                        "No package manager detected (npm, yarn, pnpm). Please install {$packageName} manually once it's published to npm."
                    );
                }
            } catch (Exception $e) {
                error("Failed to install {$packageName}: ".$e->getMessage());
                info(
                    "You can install it manually once it's published with: npm install {$packageName}"
                );
            }
        } else {
            info(
                "Skipped {$packageName} installation. You can install it manually once published with: npm install {$packageName}"
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

    private function updateEnvFile(string $key, string $value): void
    {
        $envFile = base_path('.env');

        if (! File::exists($envFile)) {
            return;
        }

        $env = File::get($envFile);

        // Check if the key already exists
        if (preg_match("/^{$key}=/m", $env)) {
            // Update existing key
            $env = preg_replace("/^{$key}=.*/m", "{$key}={$value}", $env);
        } else {
            // Add new key
            $env .= "\n{$key}={$value}";
        }

        File::put($envFile, $env);
    }
}
