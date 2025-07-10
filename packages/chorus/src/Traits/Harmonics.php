<?php

declare(strict_types=1);

namespace Pixelsprout\LaravelChorus\Traits;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Pixelsprout\LaravelChorus\Adapters\EloquentHarmonicSourceAdapter;
use Pixelsprout\LaravelChorus\Events\HarmonicCreated;
use Pixelsprout\LaravelChorus\Listeners\TrackChannelConnections;
use Pixelsprout\LaravelChorus\Models\Harmonic;
use Pixelsprout\LaravelChorus\Adapters\HarmonicSourceAdapterManager;
use Pixelsprout\LaravelChorus\Support\Prefix;
use App\Models\User;

trait Harmonics
{
    use HasUuids;

    public static function bootHarmonics(): void
    {
        $manager = app(HarmonicSourceAdapterManager::class);
        $manager->startTracking(static::class);
    }

    public function getSyncFields(): array
    {
        $syncFields = [];

        if (
            property_exists($this, "syncFields") &&
            is_array($this->syncFields)
        ) {
            $syncFields = $this->syncFields;
        } elseif (method_exists($this, "syncFields")) {
            $syncFields = $this->syncFields();
        }

        $primaryKey = $this->getKeyName();
        if (!in_array($primaryKey, $syncFields)) {
            array_unshift($syncFields, $primaryKey);
        }

        return $syncFields;
    }

    public function getSyncFilter()
    {
        if (method_exists($this, "syncFilter")) {
            return $this->syncFilter();
        }

        return null;
    }

    public function getChorusChannelName(string $userId): string
    {
        $prefix = Prefix::resolve($this);

        $user = User::find($userId);

        if (!$user) {
            return "";
        }

        if (empty($prefix)) {
            return "chorus.user.{$user->getAuthIdentifier()}";
        }

        return "chorus.$prefix.user.{$user->getAuthIdentifier()}";
    }
}
