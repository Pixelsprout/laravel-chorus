# @pixelsprout/chorus-alpine

Alpine.js integration for Chorus sync engine - reactive table data with magic methods.

## Installation

```bash
npm install @pixelsprout/chorus-alpine alpinejs
```

## Quick Start

### Option 1: Using Laravel Blade Directive (Recommended)

In your Blade layout file, add the `@chorus` directive to set up the Chorus configuration:

```html
<!-- resources/views/layouts/app.blade.php -->
<!DOCTYPE html>
<html>
<head>
    <!-- ... other head content -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @chorus(['debugMode' => config('app.debug')])
</head>
<body>
    <!-- Your content -->
</body>
</html>
```

The directive outputs a `<script>` tag that sets `window.chorusConfig` with:
- `userId` - Automatically set from `auth()->id()`
- `endpoint` - API endpoint (default: `/api`)
- `websocketUrl` - WebSocket URL (from Reverb config, default: `ws://localhost:8080`)
- `debugMode` - Debug mode (from your app config)

Then in your JavaScript file (e.g., `resources/js/app.js`), initialize Alpine with Chorus:

```javascript
// resources/js/app.js
import Alpine from 'alpinejs'
import chorus from '@pixelsprout/chorus-alpine'

window.Alpine = Alpine

Alpine.plugin(chorus)
Alpine.start()

// Chorus will auto-initialize using window.chorusConfig set by the Blade directive
```

### Option 2: Manual JavaScript Initialization (Plugin)

```javascript
// main.js
import Alpine from 'alpinejs'
import chorus from '@pixelsprout/chorus-alpine'

window.Alpine = Alpine

// Register Chorus as an Alpine plugin
Alpine.plugin(chorus)

// Start Alpine (Chorus will auto-initialize if window.chorusConfig is set)
Alpine.start()

// Or manually initialize after starting Alpine
document.addEventListener('alpine:init', async () => {
  await Alpine.magic('chorus')().init({
    userId: 1,
    debugMode: true
  })
})
```

## Using in Blade Templates

```html
<!-- user-list.blade.php -->
<div x-data="{
  users: $table('users')
}">
  <ul>
    <template x-for="(user, index) in users" :key="user.id">
      <li>
        <span x-text="index"></span>: <span x-text="user.name"></span>
      </li>
    </template>
  </ul>
</div>
```

## Magic Methods

### `$table(tableName)`

Returns a reactive array of records from the specified table. The array automatically updates when records are added, updated, or deleted.

```html
<div x-data="{
  users: $table('users'),
  posts: $table('posts')
}">
  <!-- users and posts arrays will automatically update -->
</div>
```

### `$chorus`

Provides access to the Chorus instance and initialization methods.

```html
<div x-data x-init="
  // Check if initialized
  if ($chorus.isInitialized) {
    console.log('Chorus is ready!')
  }

  // Access the core instance
  const harmonic = $chorus.instance.getHarmonic('some-id')
">
  <!-- Use chorus methods -->
</div>
```

**Available properties:**
- `$chorus.instance` - The underlying ChorusCore instance
- `$chorus.init(config)` - Initialize or reconfigure Chorus
- `$chorus.isInitialized` - Boolean indicating initialization status

## Configuration Options

### Blade Directive Configuration

The `@chorus` directive accepts an optional array of configuration options:

```php
@chorus([
    'debugMode' => config('app.debug'),
    'endpoint' => '/api/chorus',
    'websocketUrl' => 'ws://localhost:8080'
])
```

Available options:
- `debugMode` - Enable debug logging (default: `config('app.debug')`)
- `endpoint` - API endpoint path (default: `/api`)
- `websocketUrl` - WebSocket server URL (default: from Reverb config or `ws://localhost:8080`)

You can also call it without arguments to use all defaults:
```php
@chorus
```

### Manual JavaScript Configuration

You can initialize Chorus manually using the `$chorus` magic property:

```javascript
// In an Alpine component
Alpine.data('myComponent', () => ({
  async init() {
    await this.$chorus.init({
      userId: 1,                           // Current user ID (auto-set by Blade directive)
      debugMode: true,                     // Enable debug logging
      onRejectedHarmonic: (harmonic) => {  // Handle rejected harmonics
        console.error('Harmonic rejected:', harmonic);
      },
      onSchemaVersionChange: (oldVersion, newVersion) => {
        console.log(`Schema updated: ${oldVersion} -> ${newVersion}`);
      }
    })
  }
}))
```

All configuration options:
- `userId` - Current user ID (auto-set by Blade directive)
- `debugMode` - Enable debug logging
- `onRejectedHarmonic` - Callback for rejected harmonics
- `onSchemaVersionChange` - Callback when schema version changes
- `onDatabaseVersionChange` - Callback when database version changes

## Advanced Usage

### Filtering and Computed Properties

```html
<div x-data="{
  users: $table('users'),
  get activeUsers() {
    return this.users.filter(user => user.status === 'active')
  },
  get userCount() {
    return this.users.length
  }
}">
  <p>Total users: <span x-text="userCount"></span></p>
  <p>Active users: <span x-text="activeUsers.length"></span></p>
  
  <ul>
    <template x-for="user in activeUsers" :key="user.id">
      <li x-text="user.name"></li>
    </template>
  </ul>
</div>
```

### Handling Loading States

```html
<div x-data="{
  users: $table('users'),
  isLoading: true
}" x-init="
  // You can check if data is loaded
  $watch('users', () => {
    isLoading = false
  })
">
  <div x-show="isLoading">Loading users...</div>
  <div x-show="!isLoading">
    <template x-for="user in users" :key="user.id">
      <li x-text="user.name"></li>
    </template>
  </div>
</div>
```

## TypeScript Support

The package includes full TypeScript definitions. For the best experience, ensure your project recognizes the global magic methods:

```typescript
// In your main.ts or types file
import '@pixelsprout/chorus-alpine/types';
```

## Error Handling

The plugin will throw errors if:
- Trying to access `$chorus.instance` or `$table()` before initialization
- Table access errors from the underlying Chorus core

```javascript
// Handle initialization errors
document.addEventListener('alpine:init', async () => {
  try {
    await Alpine.magic('chorus')().init({
      userId: 1,
      debugMode: true
    })
  } catch (error) {
    console.error('Failed to initialize Chorus:', error)
  }
})

// Or in a component
Alpine.data('myComponent', () => ({
  async init() {
    try {
      // Check if already initialized
      if (!this.$chorus.isInitialized) {
        await this.$chorus.init({ userId: 1 })
      }

      // Now safe to use
      this.users = this.$table('users')
    } catch (error) {
      console.error('Chorus initialization failed:', error)
    }
  }
}))
```

## License

MIT