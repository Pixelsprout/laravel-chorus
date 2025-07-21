# Laravel Chorus Write Actions - Unified API Examples

## New Unified API vs Old Separate Calls

### Before (Separate Optimistic + Server Calls)
```typescript
import { useWriteActions } from '@chorus/js';

function MyComponent({ messageActions }) {
  const { execute, isExecuting, error } = useWriteActions('messages');
  
  const handleCreate = async () => {
    try {
      // 1. Manual optimistic update
      if (messageActions.create) {
        const optimisticMessage = {
          id: generateId(),
          body: 'Hello World',
          platform_id: '123',
          created_at: new Date()
        };
        messageActions.create(optimisticMessage);
      }
      
      // 2. Separate server request
      const result = await execute('create', {
        content: 'Hello World',
        platformId: '123'
      });
      
      if (result.success) {
        console.log('Created:', result.data);
      } else {
        console.error('Failed:', result.error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  return (
    <div>
      <button onClick={handleCreate} disabled={isExecuting}>
        Create Message
      </button>
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

### After (Unified API)
```typescript
import { useTable } from '@chorus/js';

function MyComponent({ messageActions }) {
  const messages = useTable<Message>('messages', {
    optimisticActions: {
      create: messageActions.create,
      update: messageActions.update,
      delete: messageActions.delete
    }
  });
  
  const handleCreate = async () => {
    const optimisticMessage = {
      id: generateId(),
      body: 'Hello World',
      platform_id: '123',
      created_at: new Date()
    };
    
    await messages.create(
      optimisticMessage,  // Optimistic data (immediate UI update)
      {                   // Server data
        content: 'Hello World',
        platformId: '123'
      },
      (result) => {       // Server response callback
        if (result.success) {
          console.log('Created:', result.data);
        } else {
          console.error('Failed:', result.error);
        }
      }
    );
  };
  
  return (
    <div>
      <button onClick={handleCreate}>Create Message</button>
    </div>
  );
}
```

## Available Methods

### Single Operations with Optimistic Updates
```typescript
const messages = useTable<Message>('messages', {
  optimisticActions: {
    create: messageActions.create,
    update: messageActions.update,
    delete: messageActions.delete
  }
});

// Create with optimistic update
await messages.create(
  optimisticData,  // Immediate UI update
  serverData,      // Data sent to server
  callback?        // Server response handler
);

// Update with optimistic update
await messages.update(
  optimisticData,  // Immediate UI update
  serverData,      // Data sent to server
  callback?        // Server response handler
);

// Delete with optimistic update
await messages.delete(
  optimisticData,  // Immediate UI update
  serverData,      // Data sent to server
  callback?        // Server response handler
);
```

### Simple Operations (without optimistic updates)
```typescript
// Create without optimistic update
await messages.create(serverData, callback?);

// Update without optimistic update
await messages.update(serverData, callback?);

// Delete without optimistic update
await messages.delete(serverData, callback?);
```

### Batch Operations
```typescript
// Batch create
await messages.createBatch(items, callback?);

// Batch update
await messages.updateBatch(items, callback?);

// Batch delete
await messages.deleteBatch(items, callback?);
```

### Multiple Tables
```typescript
import { useTables } from '@chorus/js';

function MyComponent() {
  const { messages, posts, comments } = useTables(['messages', 'posts', 'comments']);
  
  await messages.create({ content: 'Hello' });
  await posts.create({ title: 'New Post' });
  await comments.create({ body: 'Great post!' });
}
```

### Direct API Access (Advanced)
```typescript
import { writeActions } from '@chorus/js';

// Get table instance
const messages = writeActions.table<Message>('messages');

// Use anywhere in your app
await messages.create({ content: 'Hello' });
```

## Benefits of the Unified API

1. **🎯 Single Call**: One method handles both optimistic update and server request
2. **⚡ Immediate UI**: Optimistic updates happen instantly for better UX
3. **🔒 Type-safe**: Full TypeScript support with generics
4. **🧠 Intuitive**: Method names match the actions directly
5. **🔄 Consistent**: Same pattern for all CRUD operations
6. **📱 Offline-ready**: Automatic offline support and batching
7. **🎛️ Flexible**: Works with or without optimistic updates
8. **🚀 Efficient**: Built-in caching and request deduplication

## Backward Compatibility

The old `useWriteActions` hook is still available for backward compatibility:

```typescript
import { useWriteActions } from '@chorus/js';

// This still works
const { execute, executeBatch } = useWriteActions('messages');
```

## Migration Guide

### From Separate Calls to Unified API

**Before:**
```typescript
// Manual optimistic update
if (messageActions.create) {
  messageActions.create(optimisticData);
}

// Separate server request
const result = await execute('create', serverData);
```

**After:**
```typescript
// Single unified call
await messages.create(optimisticData, serverData, callback);
```

### Step-by-Step Migration

1. Replace `useWriteActions('tableName')` with `useTable<Type>('tableName', options)`
2. Pass optimistic actions in the options parameter
3. Combine optimistic update + server request into single method call
4. Use three-parameter format: `action(optimisticData, serverData, callback)`
5. Remove manual optimistic update calls
6. Remove manual error state management (handled by callbacks)