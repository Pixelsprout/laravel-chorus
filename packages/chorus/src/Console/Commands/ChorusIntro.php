<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Console\Commands;

use Illuminate\Console\Command;

use function Laravel\Prompts\info;

final class ChorusIntro extends Command
{
    protected $signature = 'chorus:intro';

    protected $description = 'A message that shows post-install of a Chorus starter-kit';

    public function handle(): void
    {
        info('Welcome to Chorus ⚡︎');
        info('<info>Visit the documentation to learn more!</info>');
        $this->line('<fg=gray>➜</> <options=bold>https://chorus.pixelsprout.dev/</>');
        info('========================');

        info('Remember to start the reverb server to get started!');
        $this->line('<fg=gray>➜</> <options=bold>php artisan reverb:start</>');
    }
}
