<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Console\Commands;

use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

final class ChorusStart extends Command
{
    protected $signature = 'chorus:start {--reverb : Start the Laravel Reverb server}';

    protected $description = 'Start the Chorus server to listen for and broadcast harmonics events';

    public function handle(): void
    {
        $this->info('Starting Chorus server...');

        // Check if Reverb is installed
        $hasReverb = File::exists(base_path('vendor/laravel/reverb'));

        // Check if the user wants to start Reverb
        if ($this->option('reverb')) {
            if (! $hasReverb) {
                $this->error('Laravel Reverb is not installed. Please run `php artisan chorus:install` first.');

                return;
            }

            $this->startReverbServer();
        } else {
            $this->info('Chorus is now active and listening for model changes.');
            $this->info('Changes to models using the Harmonics trait will be broadcast via Laravel\'s event system.');

            if ($hasReverb) {
                $this->info('To start the Reverb WebSocket server, run: php artisan chorus:start --reverb');
            } else {
                $this->info('To use WebSocket broadcasting, run: php artisan chorus:install');
            }
        }
    }

    private function startReverbServer(): void
    {
        $this->info('Starting Laravel Reverb server...');

        try {
            // Change to the base directory
            $currentDir = getcwd();
            chdir(base_path());

            $this->info('Laravel Reverb server is running.');
            $this->info('Chorus is now active and broadcasting model changes via Reverb.');
            $this->info('Press Ctrl+C to stop the server.');

            // Run the command (this will block until it's terminated)
            passthru('php artisan reverb:start', $returnCode);

            // Change back to original directory
            chdir($currentDir);

            if ($returnCode !== 0) {
                $this->error("Reverb server exited with error code: {$returnCode}");
            }

        } catch (Exception $e) {
            $this->error("Error starting Reverb server: {$e->getMessage()}");
        }
    }
}
