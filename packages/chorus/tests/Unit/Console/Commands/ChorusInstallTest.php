<?php

declare(strict_types=1);

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Pixelsprout\LaravelChorus\Console\Commands\ChorusInstall;

test('command has correct signature and description', function () {
    // Arrange
    $command = new ChorusInstall();

    // Act & Assert
    expect($command->getName())->toBe('chorus:install')
        ->and($command->getDescription())->toBe('Install and set up Laravel Chorus with Reverb for WebSocket broadcasting');
});

test('detectPackageManager returns pnpm when pnpm-lock.yaml exists', function () {
    // Arrange
    File::shouldReceive('exists')
        ->with(base_path('pnpm-lock.yaml'))
        ->once()
        ->andReturn(true);

    $command = new ChorusInstall();
    $command->setLaravel($this->app);

    // Act
    $result = callMethod($command, 'detectPackageManager');

    // Assert
    expect($result)->toBe('pnpm');
});

test('detectPackageManager returns yarn when yarn.lock exists', function () {
    // Arrange
    File::shouldReceive('exists')
        ->with(base_path('pnpm-lock.yaml'))
        ->once()
        ->andReturn(false);
    File::shouldReceive('exists')
        ->with(base_path('yarn.lock'))
        ->once()
        ->andReturn(true);

    $command = new ChorusInstall();
    $command->setLaravel($this->app);

    // Act
    $result = callMethod($command, 'detectPackageManager');

    // Assert
    expect($result)->toBe('yarn');
});

test('detectPackageManager returns npm when package-lock.json exists', function () {
    // Arrange
    File::shouldReceive('exists')
        ->with(base_path('pnpm-lock.yaml'))
        ->once()
        ->andReturn(false);
    File::shouldReceive('exists')
        ->with(base_path('yarn.lock'))
        ->once()
        ->andReturn(false);
    File::shouldReceive('exists')
        ->with(base_path('package-lock.json'))
        ->once()
        ->andReturn(true);

    $command = new ChorusInstall();
    $command->setLaravel($this->app);

    // Act
    $result = callMethod($command, 'detectPackageManager');

    // Assert
    expect($result)->toBe('npm');
});

test('detectPackageManager returns null when no package manager found', function () {
    // Arrange
    File::shouldReceive('exists')->andReturn(false);

    $processResult = new class
    {
        public function successful(): bool
        {
            return false;
        }
    };

    Process::shouldReceive('run')->andReturn($processResult);

    $command = new ChorusInstall();
    $command->setLaravel($this->app);

    // Act
    $result = callMethod($command, 'detectPackageManager');

    // Assert
    expect($result)->toBeNull();
});

test('detectPackageManager falls back to command detection when no lock files exist', function () {
    // Arrange
    File::shouldReceive('exists')->andReturn(false);

    $processResult = new class
    {
        public function successful(): bool
        {
            return true;
        }
    };

    Process::shouldReceive('run')
        ->with('which pnpm')
        ->once()
        ->andReturn($processResult);

    $command = new ChorusInstall();
    $command->setLaravel($this->app);

    // Act
    $result = callMethod($command, 'detectPackageManager');

    // Assert
    expect($result)->toBe('pnpm');
});

test('runPackageManagerCommand constructs command correctly', function () {
    // Arrange
    $processResult = new class
    {
        public function successful(): bool
        {
            return true;
        }

        public function output(): string
        {
            return 'Success';
        }

        public function errorOutput(): string
        {
            return '';
        }
    };

    Process::shouldReceive('path')
        ->with(base_path())
        ->once()
        ->andReturnSelf();
    Process::shouldReceive('run')
        ->with('npm install @pixelsprout/chorus-js')
        ->once()
        ->andReturn($processResult);

    // Create a simple test command that captures output
    $command = new class extends Illuminate\Console\Command
    {
        public $capturedOutput = [];

        public function info($string, $verbosity = null)
        {
            $this->capturedOutput[] = ['info', $string];
        }

        public function line($string, $style = null, $verbosity = null)
        {
            $this->capturedOutput[] = ['line', $string];
        }

        public function runPackageManagerCommand(string $packageManager, array $args): void
        {
            $command = $packageManager.' '.implode(' ', $args);
            $this->info("Running: {$command}");

            $result = Process::path(base_path())->run($command);

            if ($result->successful()) {
                $this->info("Successfully ran: {$command}");
                if ($result->output()) {
                    $this->line($result->output());
                }
            } else {
                throw new Exception('Package manager command failed');
            }
        }
    };

    $command->setLaravel($this->app);

    // Act
    $command->runPackageManagerCommand('npm', ['install', '@pixelsprout/chorus-js']);

    // Assert
    expect($command->capturedOutput)->toContain(['info', 'Running: npm install @pixelsprout/chorus-js'])
        ->and($command->capturedOutput)->toContain(['info', 'Successfully ran: npm install @pixelsprout/chorus-js'])
        ->and($command->capturedOutput)->toContain(['line', 'Success']);
});

test('runPackageManagerCommand throws exception on command failure', function () {
    // Arrange
    $processResult = new class
    {
        public function successful(): bool
        {
            return false;
        }

        public function output(): string
        {
            return '';
        }

        public function errorOutput(): string
        {
            return 'Command failed';
        }
    };

    Process::shouldReceive('path')
        ->with(base_path())
        ->once()
        ->andReturnSelf();
    Process::shouldReceive('run')
        ->with('npm install @pixelsprout/chorus-js')
        ->once()
        ->andReturn($processResult);

    // Create a simple test command that captures output
    $command = new class extends Illuminate\Console\Command
    {
        public $capturedOutput = [];

        public function info($string, $verbosity = null)
        {
            $this->capturedOutput[] = ['info', $string];
        }

        public function error($string, $verbosity = null)
        {
            $this->capturedOutput[] = ['error', $string];
        }

        public function runPackageManagerCommand(string $packageManager, array $args): void
        {
            $command = $packageManager.' '.implode(' ', $args);
            $this->info("Running: {$command}");

            $result = Process::path(base_path())->run($command);

            if ($result->successful()) {
                $this->info("Successfully ran: {$command}");
                if ($result->output()) {
                    $this->line($result->output());
                }
            } else {
                $this->error("Failed to run: {$command}");
                if ($result->errorOutput()) {
                    $this->error($result->errorOutput());
                }
                throw new Exception('Package manager command failed');
            }
        }
    };

    $command->setLaravel($this->app);

    // Act & Assert
    expect(fn () => $command->runPackageManagerCommand('npm', ['install', '@pixelsprout/chorus-js']))
        ->toThrow(Exception::class, 'Package manager command failed')
        ->and($command->capturedOutput)->toContain(['info', 'Running: npm install @pixelsprout/chorus-js'])
        ->and($command->capturedOutput)->toContain(['error', 'Failed to run: npm install @pixelsprout/chorus-js'])
        ->and($command->capturedOutput)->toContain(['error', 'Command failed']);

});

test('command can be instantiated and has handle method', function () {
    // Arrange
    $command = new ChorusInstall();
    $command->setLaravel($this->app);

    // Act & Assert
    expect($command)->toBeInstanceOf(ChorusInstall::class)
        ->and(method_exists($command, 'handle'))->toBeTrue();
});

test('private methods exist and are callable via reflection', function () {
    // Arrange
    $command = new ChorusInstall();
    $reflection = new ReflectionClass($command);

    // Act & Assert
    expect($reflection->hasMethod('setupReverb'))->toBeTrue()
        ->and($reflection->hasMethod('configureBroadcasting'))->toBeTrue()
        ->and($reflection->hasMethod('installChorusJS'))->toBeTrue()
        ->and($reflection->hasMethod('createGeneratedDirectory'))->toBeTrue()
        ->and($reflection->hasMethod('detectPackageManager'))->toBeTrue()
        ->and($reflection->hasMethod('runPackageManagerCommand'))->toBeTrue();
});

test('command class is declared final and extends Laravel Command', function () {
    // Arrange
    $reflection = new ReflectionClass(ChorusInstall::class);
    $command = new ChorusInstall();

    // Act & Assert
    expect($reflection->isFinal())->toBeTrue()
        ->and($command)->toBeInstanceOf(Illuminate\Console\Command::class);
});

function callMethod($object, string $method, array $args = [])
{
    $reflection = new ReflectionClass($object);
    $method = $reflection->getMethod($method);
    $method->setAccessible(true);

    return $method->invokeArgs($object, $args);
}
