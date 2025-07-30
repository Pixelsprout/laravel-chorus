<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Console\Commands;

use Illuminate\Console\Command;
use Pixelsprout\LaravelChorus\Listeners\TrackChannelConnections;

final class ChorusDebug extends Command
{
    protected $signature = 'chorus:debug';

    protected $description = 'Debug Chorus active channels and connections';

    public function handle(): void
    {
        $this->info('Chorus Debug Information');
        $this->info('========================');

        // Get active channels
        $tracker = new TrackChannelConnections();
        $activeChannels = $tracker->getActiveChannels();

        $this->info('Active Channels: '.count($activeChannels));
        foreach ($activeChannels as $channel => $timestamp) {
            $this->line("  {$channel} (connected at: ".date('Y-m-d H:i:s', $timestamp).')');
        }

        // Get active user IDs
        $activeUserIds = TrackChannelConnections::getActiveUserIds();
        $this->info('Active User IDs: '.implode(', ', $activeUserIds));

        $this->info('');
        $this->info('To test real-time updates:');
        $this->info('1. Connect to the app in your browser');
        $this->info('2. Run this command again to see if channels are tracked');
        $this->info('3. Edit a message in tinker: Message::find(1)->update(["body" => "test"]);');
        $this->info('4. Check Laravel logs for harmonic creation and broadcasting');
    }
}
