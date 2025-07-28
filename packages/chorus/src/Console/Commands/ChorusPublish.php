<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

final class ChorusPublish extends Command
{
    protected $signature = "chorus:publish";
    protected $description = "Publish Laravel Chorus assets (migrations, config, and channels)";

    public function handle(): void
    {
        $this->info("Publishing Laravel Chorus assets...");

        // Publish migrations, config, and JavaScript assets
        $this->publishAssets();
        
        // Publish channels configuration
        $this->publishChannels();

        $this->info("Laravel Chorus assets have been published successfully!");
    }

    private function publishAssets(): void
    {
        $this->call("vendor:publish", [
            "--tag" => "chorus-migrations",
        ]);

        $this->call("vendor:publish", [
            "--tag" => "chorus-config",
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
        $requireStatement = "\n\nrequire __DIR__.'/channels-chorus.php';\n";

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
}