<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Listeners;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Laravel\Reverb\Events\ChannelCreated;
use Laravel\Reverb\Events\ChannelRemoved;

class TrackChannelConnections
{
    private const CACHE_KEY = "chorus_active_channels";
    private const CACHE_TTL = 3600; // 1 hour

    /**
     * Handle channel created event
     */
    public function handleChannelCreated(ChannelCreated $event): void
    {
        $channelName = $event->channel->name();

        // Only track Chorus user channels
        if (str_starts_with($channelName, "private-chorus.user.")) {
            $this->addActiveChannel($channelName);
        }
    }

    /**
     * Handle channel removed event
     */
    public function handleChannelRemoved(ChannelRemoved $event): void
    {
        $channelName = $event->channel->name();

        // Only track Chorus user channels
        if (str_starts_with($channelName, "private-chorus.user.")) {
            $this->removeActiveChannel($channelName);
        }
    }

    /**
     * Add a channel to the active channels cache
     */
    private function addActiveChannel(string $channelName): void
    {
        $activeChannels = $this->getActiveChannels();
        $activeChannels[$channelName] = now()->timestamp;

        Cache::put(self::CACHE_KEY, $activeChannels, self::CACHE_TTL);
    }

    /**
     * Remove a channel from the active channels cache
     */
    private function removeActiveChannel(string $channelName): void
    {
        $activeChannels = $this->getActiveChannels();
        unset($activeChannels[$channelName]);

        Cache::put(self::CACHE_KEY, $activeChannels, self::CACHE_TTL);
    }

    /**
     * Get all active channels from cache
     */
    public function getActiveChannels(): array
    {
        return Cache::get(self::CACHE_KEY, []);
    }

    /**
     * Get all active user IDs
     */
    public static function getActiveUserIds(): array
    {
        $activeChannels = Cache::get(self::CACHE_KEY, []);
        $userIds = [];

        foreach (array_keys($activeChannels) as $channelName) {
            // Match both numeric IDs and UUIDs
            if (
                preg_match(
                    '/^private-chorus\.user\.(.+)$/',
                    $channelName,
                    $matches
                )
            ) {
                $userIds[] = $matches[1]; // Keep as string to support UUIDs
            }
        }

        return array_unique($userIds);
    }

    /**
     * Get all active user IDs that are authorized to view the model.
     */
    public static function getAuthorizedActiveUserIds(Model $model): array
    {
        $activeUserIds = self::getActiveUserIds();
        $userModelClass = config("auth.providers.users.model");

        if (!$userModelClass) {
            return [];
        }

        // If a policy doesn't exist for the model, we'll allow by default
        if (!Gate::getPolicyFor($model)) {
            return $activeUserIds;
        }

        $authorizedUserIds = [];

        // Eager load users to avoid N+1 queries
        $users = $userModelClass
            ::whereIn("id", $activeUserIds)
            ->get()
            ->keyBy("id");

        foreach ($activeUserIds as $userId) {
            $user = $users->get($userId);

            if ($user && Gate::forUser($user)->allows("view", $model)) {
                $authorizedUserIds[] = $userId;
            }
        }

        return $authorizedUserIds;
    }
}
