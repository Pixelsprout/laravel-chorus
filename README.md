<p align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://github.com/braedencrankd/laravel-chorus/blob/main/art/Chorus_Logo_Dark.png?raw=true">
        <source media="(prefers-color-scheme: light)" srcset="https://github.com/braedencrankd/laravel-chorus/blob/main/art/Chorus_Logo_Light.png?raw=true">
        <img alt="Chorus Logo" width="50%" src="https://github.com/braedencrankd/laravel-chorus/blob/main/art/Chorus_Logo_Dark.png?raw=true">
    </picture>
</p>

# Laravel Chorus

Laravel Chorus enables seamless real-time synchronization of specific database tables and columns to clients, using database event logging, Redis, Laravel Reverb, and IndexedDB on the frontend.

## Why Laravel Chorus?

Traditional real-time applications often struggle with:
- Complex state management between server and client
- Inefficient data fetching and caching
- Difficulty maintaining data consistency across multiple clients
- Poor offline capabilities

Laravel Chorus solves these problems by:
- **Automatic Data Sync**: Changes to your models are automatically tracked and synced to connected clients
- **Offline-First**: Client-side data is stored in IndexedDB, enabling offline functionality
- **Real-time Updates**: Uses Laravel Reverb WebSockets for instant updates across all connected clients
- **Selective Sync**: Configure exactly which tables and columns should be synced
- **User-scoped Data**: Each user only receives data they're authorized to see

## Project Structure

```
laravel-chorus/
├── packages
│   └── chorus/                     # Main Chorus package
│   │   ├── src/
│   │   │   ├── Console/Commands/   # Artisan commands (install, generate, debug)
│   │   ├── Events/                 # HarmonicCreated broadcasting event
│   │   ├── Listeners/              # Channel tracking for active connections
│   │   ├── Models/                 # Harmonic model for change tracking
│   │   ├── Providers/              # Service provider
│   │   └── Traits/                 # Harmonics trait for models
    └── chorus-js/
        ├── src/

└── examples/hello-chorus/          # Example Laravel application
    ├── app/Models/                 # Example models using Harmonics trait
    ├── resources/js/               # Frontend React application
    └── routes/channels.php         # WebSocket channel authorization
```

## How to Run the Example

1. **Install Dependencies**:
   ```bash
   cd examples/hello-chorus
   composer install
   npm install
   ```

2. **Set up Environment**:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

3. **Configure Database**:
   - Update .env with your database credentials
   - Run migrations:
     ```bash
     php artisan migrate
     ```

4. **Install Chorus**:
   ```bash
   php artisan chorus:install
   ```

5. **Generate Schema**:
   ```bash
   php artisan chorus:generate
   ```

6. **Start Services**:
   ```bash
   # Terminal 1: Start Laravel Reverb
   php artisan reverb:start

   # Terminal 2: Start Laravel development server, Vite and logging
   composer dev
   ```

7. **Test Real-time Sync**:
   - Open the app in multiple browser windows
   - Edit data in one window or via Tinker
   - Watch real-time updates across all clients

## Current Implementation Status

### Completed Features

#### a) Data Sync via Event Logging (Harmonics)
- **Harmonics Trait**: Add to any Eloquent model to automatically track changes
- **Change Tracking**: Records create, update, and delete operations
- **Selective Fields**: Configure which columns to sync per model
- **User Scoping**: Associate changes with specific users

```php
// Example model with Harmonics trait
class Message extends Model {
    use Harmonics;

    // Define which fields to sync
    protected $syncFields = [
        'id', 'body', 'user_id', 'created_at', 'updated_at'
    ];

    // Filter data per user
    protected function syncFilter(): Builder {
        return static::query()->where('user_id', auth()->id());
    }
}
```

#### b) Local State Storage
- **IndexedDB Integration**: Client-side data persistence using Dexie.js
- **Offline Capabilities**: Data remains available when offline
- **Reactive Queries**: Real-time UI updates using useLiveQuery

#### c) Real-time WebSocket Sync
- **Laravel Reverb**: WebSocket server for real-time communication
- **Channel Tracking**: Automatically tracks active user connections
- **Broadcasting**: Changes broadcast to all connected clients instantly
- **Channel Authorization**: Secure per-user private channels

#### d) React Integration
Full React support with the ChorusProvider:

```jsx
import { ChorusProvider, useHarmonics } from '@/chorus/react';
import { usePage } from '@inertiajs/react';

// Wrap your app with ChorusProvider
function App() {
    const { auth } = usePage().props;

    return (
        <ChorusProvider userId={auth.user?.id}>
            <YourAppContent />
        </ChorusProvider>
    );
}

// Use harmonized data in components
function MessagesList() {
    const { data: messages, isLoading, error } = useHarmonics('messages');

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            {messages?.map(message => (
                <div key={message.id}>{message.body}</div>
            ))}
        </div>
    );
}
```

### To Be Implemented

#### Advanced Permission System
- **Granular Permissions**: Row-level and column-level access control
- **Role-based Access**: Integration with Laravel's authorisation system
- **Dynamic Filtering**: Runtime permission evaluation

#### Additional Framework Support
- **Harmonics base class**: For data that is not coupled to a model, we could have a base Harmonic class where data can be defined/fetched and then synced to the client.
- **Vue.js Integration**: Vue 3 composition API support
- **Vanilla JavaScript**: Framework-agnostic core library
- **Alpine.js**: Lightweight integration option
- **NPM package**: The core JavaScript library/Dexie.js library could eventually be an NPM package. For now, we are publishing the assets to the project.

#### Enhanced Features
- **Conflict Resolution**: Handle concurrent edits gracefully
- **Batch Operations**: Optimize multiple changes
- **Schema Migrations**: Handle database schema changes (solution: Could wipe local dbs and reinstantiate local db when this happens).
- **Performance Monitoring**: Track sync performance and bottlenecks

#### Testing
- Currently, no tests have been added. Once the API has stabilised, it will be a good idea to start adding tests.

## Commands

```bash
# Check active connections and channel status
php artisan chorus:debug

# Generate/regenerate IndexedDB schema
php artisan chorus:generate

# Install Chorus in existing project
php artisan chorus:install
```

## Contributing

This project is in active development. Contributions are welcome! Please take a look at the issues for areas that need work.

## License

Laravel Chorus is open-sourced software licensed under the MIT license.
