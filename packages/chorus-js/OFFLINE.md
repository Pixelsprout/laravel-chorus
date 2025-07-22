# Offline Support for Laravel Chorus

Laravel Chorus now includes comprehensive offline support, allowing your application to continue functioning when users lose internet connectivity. This document explains how to implement and use the offline features.

## Overview

The offline support system includes:

1. **Automatic request caching** - API requests are cached when offline
2. **Online/offline detection** - Browser events monitor connectivity
3. **Automatic synchronization** - Cached requests are processed when back online
4. **Harmonic sync** - Missed harmonics are fetched after reconnection
5. **React components** - UI components for offline state management

## Core Components

### OfflineManager

The `OfflineManager` handles offline state and request caching:

```typescript
import { offlineManager } from '@chorus/js';

// Check online status
const isOnline = offlineManager.getIsOnline();

// Listen for connectivity changes
offlineManager.onOnline(() => {
  console.log('Back online!');
});

offlineManager.onOffline(() => {
  console.log('Gone offline!');
});

// Manually process pending requests
await offlineManager.processPendingRequests();
```

### Offline-Aware Fetch

Use `offlineFetch` instead of regular `fetch` for automatic offline handling:

```typescript
import { offlineFetch } from '@chorus/js';

try {
  const response = await offlineFetch('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ message: 'Hello' }),
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (response.headers.get('X-Chorus-Cached')) {
    // Request was cached for offline processing
    console.log('Request cached:', response.headers.get('X-Chorus-Request-Id'));
  }
} catch (error) {
  // Handle offline errors
}
```

### Inertia.js Integration

For applications using Inertia.js, use the offline router wrapper:

```typescript
import { router } from '@inertiajs/react';
import { createOfflineRouter } from '@chorus/js';

const offlineRouter = createOfflineRouter(router);

// Use like normal Inertia router, but with offline support
offlineRouter.post('/messages', { message: 'Hello' }, {
  onOfflineCached: (requestId) => {
    console.log('Request cached:', requestId);
  }
});
```

## React Integration

### useOffline Hook

Monitor offline state in React components:

```typescript
import { useOffline } from '@chorus/js/react';

function MyComponent() {
  const { 
    isOnline, 
    pendingRequestsCount, 
    processPendingRequests,
    clearPendingRequests 
  } = useOffline();

  return (
    <div>
      <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
      {pendingRequestsCount > 0 && (
        <p>{pendingRequestsCount} requests pending</p>
      )}
      <button onClick={processPendingRequests}>Sync Now</button>
    </div>
  );
}
```

### Offline Components

Use pre-built components for offline UI:

```typescript
import { OfflineIndicator, OfflineBanner } from '@chorus/js/react';

function App() {
  return (
    <div>
      <OfflineBanner />
      <OfflineIndicator 
        showPendingCount={true}
        showRetryButton={true}
      />
      {/* Your app content */}
    </div>
  );
}
```

## ChorusCore Integration

The `ChorusCore` automatically handles offline scenarios:

```typescript
import { ChorusCore } from '@chorus/js';

const chorus = new ChorusCore();

// Check online status
const isOnline = chorus.getIsOnline();

// Make offline-aware requests
const response = await chorus.makeRequest('/api/data', {
  method: 'POST',
  body: JSON.stringify(data)
});

// Access offline manager
const offlineManager = chorus.getOfflineManager();
```

## How It Works

### Request Caching

When offline, mutation requests (POST, PUT, PATCH, DELETE) are automatically cached in localStorage with:

- Request URL and method
- Request body and headers
- Timestamp and retry count
- Unique request ID

### Automatic Sync

When connectivity is restored:

1. **Pending requests** are processed in order
2. **Failed requests** are retried up to 3 times
3. **Harmonic sync** fetches missed updates
4. **UI updates** reflect the new online state

### Data Consistency

The system ensures data consistency by:

- Processing requests in chronological order
- Handling conflicts with server-side validation
- Maintaining optimistic updates in IndexedDB
- Syncing harmonics to catch missed changes

## CSRF Token Management

Laravel Chorus automatically handles CSRF token refresh for offline requests:

### Automatic CSRF Handling

```typescript
import { csrfManager } from '@chorus/js';

// Check current token
const token = csrfManager.getToken();

// Manually refresh token
const newToken = await csrfManager.refreshToken();

// Check if error is CSRF-related
const isCSRFError = csrfManager.isTokenExpired(error);
```

### Laravel Setup

Add a CSRF token refresh endpoint to your Laravel routes:

```php
// routes/web.php
Route::get('/csrf-token', function () {
    return response()->json([
        'csrf_token' => csrf_token()
    ]);
})->name('csrf-token');
```

### How It Works

1. **Token Caching** - CSRF tokens are automatically included in offline requests
2. **Proactive Refresh** - Fresh tokens are obtained before processing offline requests
3. **Batch Processing** - One token refresh handles all pending requests
4. **Meta Tag Updates** - The CSRF meta tag is updated with new tokens

## Configuration

### Request Retry Settings

Customize retry behavior:

```typescript
// In offline.ts, modify these constants:
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
```

### Cache Storage

Offline requests are stored in localStorage with the key `chorus_offline_requests`. The cache automatically:

- Persists across browser sessions
- Removes successful requests
- Limits failed requests to prevent storage bloat

## Error Handling

### Offline Errors

Handle offline scenarios gracefully:

```typescript
try {
  await offlineFetch('/api/data', { method: 'POST', body: data });
} catch (error) {
  if (error.message.includes('offline')) {
    // Handle offline state
    showOfflineMessage();
  }
}
```

### Sync Failures

Monitor sync failures:

```typescript
offlineManager.onOnline(async () => {
  try {
    await offlineManager.processPendingRequests();
  } catch (error) {
    console.error('Sync failed:', error);
    // Handle sync failure
  }
});
```

## Best Practices

1. **Use optimistic updates** - Update UI immediately, sync later
2. **Provide feedback** - Show offline status and pending requests
3. **Handle conflicts** - Implement server-side conflict resolution
4. **Test offline scenarios** - Use browser dev tools to simulate offline
5. **Graceful degradation** - Disable features that require connectivity

## Testing

Test offline functionality:

1. **Browser DevTools** - Use Network tab to simulate offline
2. **Manual testing** - Disconnect network, perform actions, reconnect
3. **Automated tests** - Mock `navigator.onLine` and network requests

```typescript
// Mock offline state for testing
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: false
});

// Trigger offline event
window.dispatchEvent(new Event('offline'));
```

## Limitations

- **Read operations** - Cannot fetch new data while offline
- **File uploads** - Large files may exceed localStorage limits
- **Real-time features** - WebSocket connections require connectivity
- **Authentication** - Token refresh may fail offline

## Migration Guide

To add offline support to existing applications:

1. **Replace fetch calls** with `offlineFetch`
2. **Wrap Inertia router** with `createOfflineRouter`
3. **Add offline components** to your UI
4. **Update error handling** for offline scenarios
5. **Test thoroughly** with offline simulation

The offline support is designed to be backward compatible and can be gradually adopted in existing applications.