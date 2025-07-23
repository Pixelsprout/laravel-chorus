# Laravel Chorus

A Laravel-first sync engine designed to seamlessly sync subsets of your database to your users' devices, enabling low-latency web applications.

## Installation

You can install the package via composer:

```bash
composer require pixelsprout/laravel-chorus
```

Then run the installer to set up Chorus and Laravel Reverb:

```bash
php artisan chorus:install
```

The installer will:
1. Publish the migrations and config files
2. Publish TypeScript utilities to `resources/js/chorus`
3. Check if Laravel Reverb is installed and offer to install it if not
4. Configure your broadcasting settings

Finally, run the migrations:

```bash
php artisan migrate
```

## Usage

### 1. Add the Harmonics trait to your models

```php
use Pixelsprout\LaravelChorus\Traits\Harmonics;

class User extends Model
{
    use Harmonics;
    
    // Specify which fields should be synced using a property
    // By default, no fields will be synced unless explicitly defined
    protected $syncFields = [
        'name',
        'email',
    ];
    
    // Alternatively, you can define a method
    public function syncFields(): array
    {
        return [
            'name',
            'email',
        ];
    }
    
    // Or override the getSyncFields method for more complex logic
    public function getSyncFields(): array
    {
        // You can include dynamic logic here
        $fields = ['name', 'email'];
        
        if ($this->is_admin) {
            $fields[] = 'role';
        }
        
        return $fields;
    }
    
    // Define a filter to limit which records get synced to the client
    public function syncFilter()
    {
        // Only sync records owned by the current user
        return $this->where('user_id', auth()->id());
    }
}
```

### 2. Start the Chorus and Reverb servers

```bash
php artisan chorus:start --reverb
```

This will start both Chorus and the Laravel Reverb WebSocket server. Changes to models using the Harmonics trait will be automatically broadcast to connected clients.

If you don't want to run Reverb from Chorus, you can run:

```bash
php artisan chorus:start
```

And then start Reverb separately with:

```bash
php artisan reverb:start
```

### 3. Listen for changes in your frontend

Chorus comes with built-in TypeScript utilities for integrating with IndexedDB and listening for changes. When you run `chorus:install`, these utilities are published to your `resources/js/chorus` directory.

#### Option 1: Using the provided hooks (Recommended)

First, set up the database:

```typescript
// stores/types.ts
import { ChorusDatabase, createChorusDb } from '@/chorus';

interface User {
    id: number;
    name: string;
    email: string;
    created_at: Date;
}

const types = createChorusDb('ChorusDatabase') as ChorusDatabase & {
    users: Dexie.Table<
        User,
        'id' // primary key
    >;
};

types.initializeSchema({
    users: '++id,name,email,created_at',
});

export { types };
```

Then use the hook in your components:

```typescript
// pages/dashboard.tsx
import { types } from '@/stores/types';
import { useHarmonics } from '@/chorus/use-harmonics';

interface User {
    id: number;
    name: string;
    email: string;
}

export default function Dashboard() {
    const { data: users, isLoading, error, lastUpdate } = useHarmonics<User>('users', types);

    return (
        <div>
            {isLoading ? (
                <p>Loading users...</p>
            ) : error ? (
                <p>Error: {error}</p>
            ) : (
                <>
                    {lastUpdate && <div>Last synchronized: {lastUpdate.toLocaleTimeString()}</div>}
                    <ul>
                        {users?.map((user) => (
                            <li key={user.id}>
                                <strong>ID: {user.id}</strong> - {user.name} - {user.email}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
```

The `useHarmonics` hook:
- Sets up IndexedDB storage via Dexie.js
- Listens for real-time updates via WebSockets
- Fetches initial data from the server
- Stores the latest harmonic ID in localStorage to optimize subsequent fetches
- Returns reactive data and loading states

#### Option 2: Using Laravel Echo directly

You can also use Laravel Echo directly for more control:

```javascript
import Echo from 'laravel-echo';
import Reverb from '@laravel/reverb-js';

window.Echo = new Echo({
    broadcaster: 'reverb',
    client: new Reverb('ws://localhost:8080/reverb'),
});

// Listen for changes to a specific table
Echo.channel('chorus.table.users')
    .listen('.harmonic.created', (e) => {
        console.log('User changed:', e);
    });

// Listen for changes to a specific record
Echo.channel('chorus.record.users.1')
    .listen('.harmonic.created', (e) => {
        console.log('User 1 changed:', e);
    });

// Listen for changes relevant to the current user
Echo.private('chorus.user.' + userId)
    .listen('.harmonic.created', (e) => {
        console.log('User-specific change:', e);
    });
```

## Configuration

You can publish the configuration file with:

```bash
php artisan vendor:publish --tag=chorus-config
```

This will create a `config/chorus.php` file where you can customize settings.

## How It Works

1. When a model using the `Harmonics` trait is created, updated, or deleted, an event is fired.
2. The event is stored in the database for persistence and broadcast via Laravel's event system.
3. Laravel Reverb broadcasts these events to connected WebSocket clients.
4. Clients listen for these events and update their local state accordingly.
5. When a new client connects, they can fetch the latest state from the harmonics table.

## Filtering Synced Records

You can control which records get synced to clients using the `syncFilter` method:

```php
class Message extends Model
{
    use Harmonics;
    
    protected $syncFields = ['content', 'user_id', 'is_read'];
    
    // Only sync messages that belong to the authenticated user
    public function syncFilter()
    {
        return $this->where(function($query) {
            $query->where('user_id', auth()->id())
                  ->orWhere('recipient_id', auth()->id());
        });
    }
}
```

The `syncFilter` method should return a query builder instance that filters the records to be synced. This applies to both initial data loading and incremental updates.

For example, if you want to sync only user-specific data, you can filter based on the authenticated user's ID. This ensures that clients only receive data relevant to them, reducing bandwidth usage and improving security.

## Contributing

Contributions are welcome!

## License

The MIT License (MIT).