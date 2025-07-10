<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Console\Commands;

use Illuminate\Console\Command;
use Laravel\Prompts\Prompt;
use Laravel\Prompts\ConfirmPrompt;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

final class ChorusInstall extends Command
{
    protected $signature = "chorus:install";
    protected $description = "Install and set up Laravel Chorus with Reverb for WebSocket broadcasting";

    public function handle(): void
    {
        $this->info("Installing Laravel Chorus...");

        // Step 1: Publish migrations, config, and channels
        $this->publishAssets();
        $this->publishChannels();

        // Step 2: Check and setup Reverb
        $this->setupReverb();

        // Step 3: Configure broadcasting
        $this->configureBroadcasting();

        // Step 4: Create _generated directory with default schema
        $this->createGeneratedDirectory();

        $this->info("Laravel Chorus has been installed successfully!");
        $this->info("Run the migrations with: php artisan migrate");
        $this->info("Start the Chorus server with: php artisan chorus:start");
        $this->info(
            "Generate IndexedDB schema with: php artisan chorus:generate"
        );
    }

    private function publishAssets(): void
    {
        $this->call("vendor:publish", [
            "--tag" => "chorus-migrations",
        ]);

        $this->call("vendor:publish", [
            "--tag" => "chorus-config",
        ]);

        $this->call("vendor:publish", [
            "--tag" => "chorus-js",
        ]);

        $this->info("JavaScript resources published to resources/js/chorus");
    }

    private function publishChannels(): void
    {
        $stubPath = __DIR__ . "/../../../stubs/channels.chorus.stub";
        $destinationPath = base_path("routes/channels-chorus.php");

        if (!File::exists($destinationPath)) {
            File::copy($stubPath, $destinationPath);
            $this->info(
                "Copied channels.chorus.stub to routes/channels-chorus.php"
            );
        }

        $channelsFilePath = base_path("routes/channels.php");
        $requireStatement = "
require __DIR__.'/channels-chorus.php';
";

        if (File::exists($channelsFilePath)) {
            $content = File::get($channelsFilePath);
            if (!str_contains($content, $requireStatement)) {
                File::append($channelsFilePath, $requireStatement);
                $this->info(
                    "Added require statement for channels-chorus.php to routes/channels.php"
                );
            }
        } else {
            File::put($channelsFilePath, "<?php" . $requireStatement);
            $this->info(
                "Created routes/channels.php and added require statement for channels-chorus.php"
            );
        }
    }

    private function setupReverb(): void
    {
        $this->info("Setting up broadcasting for Laravel Chorus...");

        // Use Laravel's built-in broadcasting installation command
        if (
            $this->confirm(
                "Would you like to set up broadcasting with Reverb?",
                true
            )
        ) {
            // Run the Laravel broadcasting installer
            $this->call("install:broadcasting");

            // Check if the reverb driver was selected
            $envFile = base_path(".env");
            if (File::exists($envFile)) {
                $env = File::get($envFile);
                if (!preg_match("/BROADCAST_DRIVER=reverb/", $env)) {
                    $this->info(
                        'Note: For the best experience with Chorus, we recommend using the "reverb" driver.'
                    );
                    $this->info(
                        "You can change this in your .env file: BROADCAST_DRIVER=reverb"
                    );
                }
            }
        } else {
            $this->warn(
                'Skipping broadcasting setup. You will need to set up broadcasting manually to use Chorus\'s real-time features.'
            );
        }
    }

    private function configureBroadcasting(): void
    {
        // Check if BroadcastServiceProvider is enabled
        if (File::exists(config_path("app.php"))) {
            $appConfig = File::get(config_path("app.php"));

            if (
                preg_match(
                    "/\/\/\s*App\\\\Providers\\\\BroadcastServiceProvider::class/",
                    $appConfig
                )
            ) {
                $this->info(
                    "BroadcastServiceProvider is commented out in your config/app.php file."
                );

                if (
                    $this->confirm(
                        "Would you like to enable BroadcastServiceProvider now?",
                        true
                    )
                ) {
                    $appConfig = preg_replace(
                        "/\/\/\s*App\\\\Providers\\\\BroadcastServiceProvider::class/",
                        "App\\Providers\\BroadcastServiceProvider::class",
                        $appConfig
                    );

                    File::put(config_path("app.php"), $appConfig);
                    $this->info(
                        "BroadcastServiceProvider has been enabled in your config/app.php file."
                    );
                }
            } elseif (
                preg_match(
                    "/App\\\\Providers\\\\BroadcastServiceProvider::class/",
                    $appConfig
                )
            ) {
                $this->info("BroadcastServiceProvider is already enabled.");
            }
        }
    }

    private function createGeneratedDirectory(): void
    {
        // Create _generated directory
        $directory = resource_path("js/_generated");

        if (!File::exists($directory)) {
            File::makeDirectory($directory, 0755, true);
            $this->info("Created directory: resources/js/_generated");
        }

        // Create default schema file
        $schemaPath = $directory . "/schema.ts";

        if (!File::exists($schemaPath)) {
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
            $this->info(
                "Created default schema file: resources/js/_generated/schema.ts"
            );
        }
    }
}
