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
├── .github/                # GitHub Actions workflows
├── art/                    # Project logos and artwork
├── docs/                   # MDX Documentation for Chorus
├── examples/               # Example Laravel + React application
│   └── hello-chorus/
├── packages/
│   ├── chorus/             # The core `laravel-chorus` package
│   └── chorus-js/          # The core `chorus-js` package (TS)
└── README.md
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

   Installing chorus will prompt you to setup Laravel Reverb if you haven't already.
   ```bash
   php artisan chorus:install
   ```

5. **Generate Schema**:
   Generates the schema object for your client to setup IndexedDB correctly
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
   - Edit data in one window or via `php artisan tinker`
   - Watch real-time updates across all clients


## Documentation
Documentation will come soon...

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
