# Laravel Chorus - Simplified Action Context API Implementation

This document outlines the simplified implementation that removes the ActionCollector dependency and works directly with the request object.

## Key Changes Made

### 1. **Server-Side Simplification**

#### Updated ChorusAction Base Class
**File**: `packages/chorus/src/Support/ChorusAction.php`

- **Removed ActionCollector dependency** - No longer uses the complex ActionCollector pattern
- **Direct request access** - Actions now work directly with structured request data
- **Simplified method signature** - `handle(Request $request): mixed` instead of `handle(Request $request, ActionCollector $actions): void`
- **Organized operation structure** - Converts flat operations array to `['table.operation' => [data...]]` format

#### New Request Structure
Operations are now organized as:
```php
$request['operations']['messages']['create'][0] // First message creation
$request['operations']['users']['update'][0]   // First user update
$request['operations']['platforms']['update'][0] // First platform update
```

This allows direct access like: `$request->input('operations.messages.create.0.id')`

### 2. **Example Action Implementation**

#### Updated CreateMessageWithActivityAction
**File**: `examples/hello-chorus/app/Actions/ChorusActions/CreateMessageWithActivityAction.php`

```php
protected function handle(Request $request): mixed
{
    $user = auth()->user();

    // Direct access to operation data
    $messageData = $request->input('operations.messages.create.0');
    Message::create([
        'id' => $messageData['id'],
        'body' => $messageData['body'],
        'platform_id' => $messageData['platform_id'],
        'user_id' => $user->id,
        'tenant_id' => $user->tenant_id,
    ]);

    // Update user activity
    User::where('id', $user->id)->update([
        'last_activity_at' => now(),
    ]);

    // Update platform metrics
    $platformData = $request->input('operations.platforms.update.0');
    Platform::where('id', $platformData['id'])->update([
        'last_message_at' => now(),
    ]);

    return [
        'test_item' => $request->input('data.test_item', 'test message'),
    ];
}
```

### 3. **Client-Side Enhancements**

#### Enhanced ActionContext API
**File**: `packages/chorus-js/src/core/writes-collector.ts`

- **ActionContextLike interface** - Provides consistent API across client/server
- **Destructuring support** - Supports `({ create, update, delete }) => {}` syntax
- **Direct method calls** - `context.create('table', data)` instead of `writes.table.create(data)`

#### New executeActionWithContext Method
**File**: `packages/chorus-js/src/core/chorus-actions.ts`

```typescript
async executeActionWithContext(
  actionName: string,
  callback: (context: ActionContextLike) => any,
  options: {
    optimistic?: boolean;
    offline?: boolean;
    validate?: boolean;
    validationSchema?: any;
  } = {}
): Promise<ChorusActionResponse>
```

### 4. **Updated Client Usage**

#### Simplified CreateMessageForm.tsx
**File**: `examples/hello-chorus/resources/js/components/forms/CreateMessageForm.tsx`

```typescript
// BEFORE (property-style):
const result = await createMessageWithActivityAction((writes) => {
  writes.messages.create({ body: value.message, platform_id: value.platformId });
  writes.users.update({ id: auth.user.id, last_activity_at: new Date().toISOString() });
  writes.platforms.update({ id: value.platformId, last_message_at: new Date().toISOString() });
});

// AFTER (simplified context):
const result = await createMessageWithActivityAction(({ create, update }) => {
  create('messages', { body: value.message, platform_id: value.platformId });
  update('users', { id: auth.user.id, last_activity_at: new Date().toISOString() });
  update('platforms', { id: value.platformId, last_message_at: new Date().toISOString() });
});
```

## Benefits of the Simplified Approach

### 1. **Server-Side Benefits**
- **No complex proxies** - Direct Eloquent model usage
- **Clearer data flow** - Explicit request access patterns
- **Better performance** - No overhead from ActionCollector tracking
- **Easier debugging** - Simple array access instead of magic methods

### 2. **Client-Side Benefits**
- **Consistent API** - Same pattern as server-side conceptually
- **Better IDE support** - Explicit method names with autocomplete
- **Destructuring support** - Modern JavaScript patterns
- **Type safety** - Clear interfaces for all operations

### 3. **Developer Experience**
- **Simpler mental model** - Direct request/response flow
- **Easier testing** - Standard Laravel request patterns
- **Better error messages** - Clear array access paths
- **Reduced abstraction** - Less magic, more explicit code

## Request Structure Example

When the client sends:
```typescript
context.create('messages', { body: 'Hello', platform_id: 'platform-123' });
context.update('users', { id: 'user-123', last_activity_at: new Date().toISOString() });
```

The server receives:
```php
$request = [
    'operations' => [
        'messages.create' => [
            ['body' => 'Hello', 'platform_id' => 'platform-123']
        ],
        'users.update' => [
            ['id' => 'user-123', 'last_activity_at' => '2024-...']
        ]
    ],
    'data' => [
        'test_item' => 'test message'
    ]
];
```

Accessible as:
- `$request->input('operations.messages.create.0.body')` → `'Hello'`
- `$request->input('operations.users.update.0.id')` → `'user-123'`
- `$request->input('data.test_item')` → `'test message'`

## Migration Path

### For Existing Code
The original ActionCollector-based API has been removed, so existing actions need to be updated to use the direct request access pattern.

### For New Code
Use the simplified `handle(Request $request): mixed` method with direct request access.

## Files Modified

### Core Package Files
- `packages/chorus/src/Support/ChorusAction.php` - Simplified base class
- `packages/chorus-js/src/core/writes-collector.ts` - Added ActionContextLike interface
- `packages/chorus-js/src/core/chorus-actions.ts` - Added executeActionWithContext method
- `packages/chorus-js/src/index.ts` - Updated exports

### Example Files
- `examples/hello-chorus/app/Actions/ChorusActions/CreateMessageWithActivityAction.php` - Updated to use direct request access
- `examples/hello-chorus/resources/js/components/forms/CreateMessageForm.tsx` - Updated to use simplified context API
- `examples/hello-chorus/resources/js/_generated/chorus-actions.ts` - Updated generated action to use executeActionWithContext
- `examples/hello-chorus/resources/js/_generated/actions.ts` - Added ActionContextLike type

### Removed Files
- `packages/chorus/src/Support/ActionContext.php` - No longer needed with simplified approach

This implementation provides a much cleaner, more maintainable approach while preserving all the functionality of the original system.