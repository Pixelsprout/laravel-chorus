# Rejected Harmonics Feature

This document explains how to use the rejected harmonics feature in Laravel Chorus to handle validation failures and permission denials gracefully.

## Overview

When a write operation (create, update, delete) is rejected by the server due to validation failures or permission issues, Chorus can create a "rejected harmonic" that is sent to the client. This allows the client application to:

1. Show appropriate error messages to users
2. Remove optimistic updates from the UI
3. Handle failed operations gracefully

## Server-Side Implementation

### 1. Creating Rejected Harmonics

The `Harmonic` model provides several helper methods for creating rejected harmonics:

```php
use Pixelsprout\LaravelChorus\Models\Harmonic;
use Illuminate\Support\Str;

// For validation failures
Harmonic::createValidationRejected(
    'create',                    // operation type
    $request->all(),            // original data
    $validator->errors()->first(), // validation error message
    auth()->id(),               // user ID
    $request->input('id') ?? Str::uuid() // optional ID
);

// For permission failures
Harmonic::createPermissionRejected(
    'update',
    $request->all(),
    auth()->id(),
    $request->input('id')
);

// Generic rejected harmonic
Harmonic::createRejected(
    'delete',
    $request->all(),
    'Custom rejection reason',
    auth()->id(),
    $request->input('id')
);
```

### 2. Example Controller Implementation

```php
Route::post('/messages', function (Request $request, CreateMessage $action) {
    $validator = Validator::make($request->all(), [
        'body' => 'required|string|max:1000',
        'platform_id' => 'required|exists:platforms,id',
    ]);
    
    if ($validator->fails()) {
        // Create a rejected harmonic for the validation failure
        Harmonic::createValidationRejected(
            'create',
            $request->all(),
            $validator->errors()->first(),
            auth()->id(),
            $request->input('id') ?? Str::uuid()
        );
        
        return response()->json(['errors' => $validator->errors()], 422);
    }
    
    // Check permissions
    if (!auth()->user()->can('create-message')) {
        Harmonic::createPermissionRejected(
            'create',
            $request->all(),
            auth()->id(),
            $request->input('id')
        );
        
        return response()->json(['error' => 'Permission denied'], 403);
    }
    
    $message = $action->execute($validator->validated(), auth()->id());
    
    return response()->json([
        'message' => 'Message created successfully',
        'data' => $message
    ], 201);
});
```

## Client-Side Implementation

### 1. React Provider Setup

```tsx
import { ChorusProvider, HarmonicEvent } from '@pixelsprout/chorus-js/react';

function App() {
  const handleRejectedHarmonic = (harmonic: HarmonicEvent) => {
    console.log('Rejected harmonic received:', harmonic);
    
    // Show error notification
    showErrorNotification({
      title: `${harmonic.operation} failed`,
      message: harmonic.rejected_reason,
      id: harmonic.id
    });
    
    // Handle specific rejection types
    if (harmonic.rejected_reason?.includes('Validation failed')) {
      // Handle validation errors
      handleValidationError(harmonic);
    } else if (harmonic.rejected_reason === 'Permission denied') {
      // Handle permission errors
      handlePermissionError(harmonic);
    }
  };

  return (
    <ChorusProvider
      userId={user.id}
      schema={chorusSchema}
      onRejectedHarmonic={handleRejectedHarmonic}
    >
      <YourApp />
    </ChorusProvider>
  );
}
```

### 2. Component Implementation

```tsx
import { useHarmonics } from '@pixelsprout/chorus-js/react';

function MessageList() {
  const { data: messages, actions } = useHarmonics<Message>('messages');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const createMessage = async (messageData: Partial<Message>) => {
    // Optimistic update - this will be shown immediately
    actions.create?.(messageData, async (data) => {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to create message');
        }
      } catch (error) {
        console.error('Failed to create message:', error);
        // The rejected harmonic will handle UI updates
      }
    });
  };

  return (
    <div>
      {/* Your message list UI */}
      {messages?.map(message => (
        <MessageItem key={message.id} message={message} />
      ))}
      
      {/* Error notifications will be handled by the rejected harmonic callback */}
    </div>
  );
}
```

### 3. Delta Status Handling

When a rejected harmonic is received, the corresponding delta record is automatically updated with:
- `sync_status: 'rejected'`
- `rejected_reason: string`

You can query rejected deltas to show failed operations:

```tsx
function FailedOperations() {
  const db = useChorusDb();
  const [failedOperations, setFailedOperations] = useState([]);

  useEffect(() => {
    const loadFailedOperations = async () => {
      const failed = await db.table('messages_deltas')
        .where('sync_status')
        .equals('rejected')
        .toArray();
      setFailedOperations(failed);
    };

    loadFailedOperations();
  }, [db]);

  return (
    <div>
      <h3>Failed Operations</h3>
      {failedOperations.map(op => (
        <div key={op.id} className="error-item">
          <p>Operation: {op.operation}</p>
          <p>Reason: {op.rejected_reason}</p>
          <button onClick={() => retryOperation(op)}>Retry</button>
        </div>
      ))}
    </div>
  );
}
```

## Database Schema Changes

The following columns have been added to the `harmonics` table:

```php
$table->boolean('rejected')->default(false);
$table->string('rejected_reason')->nullable();
```

## Best Practices

1. **Always provide meaningful rejection reasons** - Help users understand why their operation failed
2. **Handle different rejection types appropriately** - Validation errors vs permission errors should be handled differently
3. **Provide retry mechanisms** - Allow users to fix validation errors and retry operations
4. **Clean up rejected deltas** - Periodically clean up old rejected delta records
5. **Log rejected operations** - Keep server-side logs of rejected operations for debugging

## Example Use Cases

1. **Form Validation**: Show field-specific errors when form submission fails
2. **Permission Checks**: Inform users when they don't have permission to perform an action
3. **Rate Limiting**: Notify users when they've exceeded rate limits
4. **Business Logic Failures**: Handle custom business rule violations
5. **Network Issues**: Distinguish between network failures and server rejections