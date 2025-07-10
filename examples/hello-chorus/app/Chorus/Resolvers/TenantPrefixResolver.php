<?php

namespace App\Chorus\Resolvers;

use Illuminate\Database\Eloquent\Model;
use Pixelsprout\LaravelChorus\Contracts\PrefixResolver;

class TenantPrefixResolver implements PrefixResolver
{
    public function resolve(Model $model): string
    {
        if (property_exists($model, 'tenant_id')) {
            return (string) $model->tenant_id;
        }

        if (method_exists($model, 'tenant') && $model->tenant()->exists()) {
            return (string) $model->tenant->id;
        }

        return '';
    }
}