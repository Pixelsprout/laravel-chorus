<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Console\Commands;

use Illuminate\Console\Command;
use Laravel\Prompts\Prompt;
use Laravel\Prompts\ConfirmPrompt;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

final class ChorusInstall extends Command {
  protected $signature = 'chorus:install';
  protected $description = 'Install and set up Laravel Chorus with Reverb for WebSocket broadcasting';

  public function handle(): void {
    $this->info('Installing Laravel Chorus...');

    // Step 1: Publish migrations and config
    $this->publishAssets();

    // Step 2: Check and setup Reverb
    $this->setupReverb();

    // Step 3: Configure broadcasting
    $this->configureBroadcasting();

    $this->info('Laravel Chorus has been installed successfully!');
    $this->info('Run the migrations with: php artisan migrate');
    $this->info('Start the Chorus server with: php artisan chorus:start');
  }

  private function publishAssets(): void {
    $this->call('vendor:publish', [
      '--tag' => 'chorus-migrations',
    ]);

    $this->call('vendor:publish', [
      '--tag' => 'chorus-config',
    ]);
    
    $this->call('vendor:publish', [
      '--tag' => 'chorus-js',
    ]);
    
    $this->info('JavaScript resources published to resources/js/chorus');
  }

  private function setupReverb(): void {
    $this->info('Setting up broadcasting for Laravel Chorus...');
    
    // Use Laravel's built-in broadcasting installation command
    if ($this->confirm('Would you like to set up broadcasting with Reverb?', true)) {
      // Run the Laravel broadcasting installer
      $this->call('install:broadcasting');
      
      // Check if the reverb driver was selected
      $envFile = base_path('.env');
      if (File::exists($envFile)) {
        $env = File::get($envFile);
        if (!preg_match('/BROADCAST_DRIVER=reverb/', $env)) {
          $this->info('Note: For the best experience with Chorus, we recommend using the "reverb" driver.');
          $this->info('You can change this in your .env file: BROADCAST_DRIVER=reverb');
        }
      }
    } else {
      $this->warn('Skipping broadcasting setup. You will need to set up broadcasting manually to use Chorus\'s real-time features.');
    }
  }

  private function configureBroadcasting(): void {
    // Check if BroadcastServiceProvider is enabled
    if (File::exists(config_path('app.php'))) {
      $appConfig = File::get(config_path('app.php'));
      
      if (preg_match('/\/\/\s*App\\\\Providers\\\\BroadcastServiceProvider::class/', $appConfig)) {
        $this->info('BroadcastServiceProvider is commented out in your config/app.php file.');
        
        if ($this->confirm('Would you like to enable BroadcastServiceProvider now?', true)) {
          $appConfig = preg_replace(
            '/\/\/\s*App\\\\Providers\\\\BroadcastServiceProvider::class/', 
            'App\\Providers\\BroadcastServiceProvider::class',
            $appConfig
          );
          
          File::put(config_path('app.php'), $appConfig);
          $this->info('BroadcastServiceProvider has been enabled in your config/app.php file.');
        }
      } else if (preg_match('/App\\\\Providers\\\\BroadcastServiceProvider::class/', $appConfig)) {
        $this->info('BroadcastServiceProvider is already enabled.');
      }
    }
  }
}

