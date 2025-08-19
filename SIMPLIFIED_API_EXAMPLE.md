# Laravel Chorus - Simplified Action Context API

This document demonstrates the new simplified Action Context API that provides a cleaner, more intuitive way to write Chorus actions on both client and server sides.

## Overview

The simplified API provides:
- **Consistent interface** between client and server
- **Explicit method names** (`create`, `update`, `delete`)
- **Better IDE support** with autocomplete and type safety
- **Cleaner syntax** compared to the property-based approach

## Server-Side Implementation

### New ActionContext Class

The `ActionContext` class provides a simplified API that wraps the existing `ActionCollector`:

```php
<?php
// packages/chorus/src/Support/ActionContext.php

final class ActionContext
{
    public function create(string $table, array|Closure $data): mixed;
    public function update(string $table, array|Closure $data): mixed;
    public function delete(string $table, mixed $id): bool;
}
```

### Enhanced ChorusAction Base Class

The `ChorusAction` base class now supports both the original API and the new simplified API:

```php
<?php
// packages/chorus/src/Support/ChorusAction.php

abstract class ChorusAction implements ChorusActionInterface
{
    // Original API (still supported)
    protected function handle(Request $request, ActionCollector $actions): void
    {
        // Calls handleWithContext if defined
    }

    // New simplified API
    protected function handleWithContext(ActionContext $context): mixed
    {
        // Override this method for simplified usage
    }
}
```

### Example Action Implementation

```php
<?php
// examples/hello-chorus/app/Actions/ChorusActions/CreateMessageWithActivityActionSimplified.php

final class CreateMessageWithActivityActionSimplified extends ChorusAction
{
    protected function handleWithContext(ActionContext $context): mixed
    {
        $user = auth()->user();

        // Create the message (client data merged automatically)
        $context->create('messages', [
            'user_id' => $user->id,
            'tenant_id' => $user->tenant_id,
        ]);

        // Update user's last activity
        $context->update('users', [
            'id' => $user->id,
            'last_activity_at' => now(),
        ]);

        // Update platform metrics - uses closure for client data
        $context->update('platforms', function($clientData) {
            return [
                'id' => $clientData->id,
                'last_message_at' => now(),
            ];
        });

        return [
            'test_item' => 'test message',
        ];
    }

    public function rules(): array
    {
        return [
            'messages.create' => [
                'id' => 'nullable|string|uuid',
                'body' => 'required|string|max:1000',
                'platform_id' => 'required|string|uuid|exists:platforms,id',
                'user_id' => 'required|string|uuid|exists:users,id',
                'tenant_id' => 'required|integer|exists:tenants,id',
            ],
            'users.update' => [
                'id' => 'required|string|uuid|exists:users,id',
                'last_activity_at' => 'required|date',
            ],
            'platforms.update' => [
                'id' => 'required|string|uuid|exists:platforms,id',
                'last_message_at' => 'nullable|date',
            ],
            'data' => [
                'test_item' => 'required|string',
            ],
        ];
    }
}
```

## Client-Side Implementation

### Enhanced ActionContextLike Interface

```typescript
// packages/chorus-js/src/core/writes-collector.ts

export interface ActionContextLike {
  create(table: string, data: Record<string, any>): void;
  update(table: string, data: Record<string, any>): void;  
  delete(table: string, data: Record<string, any>): void;
}
```

### New ChorusActionsAPI Method

```typescript
// packages/chorus-js/src/core/chorus-actions.ts

export class ChorusActionsAPI {
  // New simplified API method
  async executeActionWithContext(
    actionName: string,
    callback: (context: ActionContextLike) => any,
    options: {
      optimistic?: boolean;
      offline?: boolean;
      validate?: boolean;
      validationSchema?: any;
    } = {}
  ): Promise<ChorusActionResponse>;
}
```

### Example Client Usage

```typescript
// examples/hello-chorus/resources/js/simplified-api-example.ts

import { getGlobalChorusActionsAPI } from '@pixelsprout/chorus-js';

const chorusAPI = getGlobalChorusActionsAPI();

// BEFORE: Property-style API
const result = await chorusAPI.executeActionWithCallback('action-name', (writes) => {
  writes.messages.create({ body: 'Hello', platform_id: 'platform-123' });
  writes.users.update({ id: 'user-123', last_activity_at: new Date().toISOString() });
  writes.platforms.update({ id: 'platform-123', last_message_at: new Date().toISOString() });
  
  return { test_item: 'test message' };
});

// AFTER: Simplified ActionContext API
const result = await chorusAPI.executeActionWithContext('action-name', (context) => {
  context.create('messages', { body: 'Hello', platform_id: 'platform-123' });
  context.update('users', { id: 'user-123', last_activity_at: new Date().toISOString() });
  context.update('platforms', { id: 'platform-123', last_message_at: new Date().toISOString() });
  
  return { test_item: 'test message' };
});
```

## Key Benefits

### 1. **Consistent API Across Client and Server**
Both client and server now use the same `context.create()`, `context.update()`, `context.delete()` pattern.

### 2. **Better IDE Support**
- Method names are explicit and discoverable
- Table names are string parameters with autocomplete
- Type safety for method signatures

### 3. **Cleaner Syntax**
```typescript
// Old: writes.tableName.operation()
writes.messages.create(data);

// New: context.operation('tableName')  
context.create('messages', data);
```

### 4. **Backward Compatibility**
The original property-style API (`writes.tableName.operation()`) continues to work unchanged.

### 5. **Unified Data Handling**
- Server-side: Automatic merging of client data with server defaults
- Client-side: Same data structures and validation
- Both: Support for closures when dynamic data access is needed

## Migration Guide

### For Existing Actions
No migration required - existing actions using `handle(Request $request, ActionCollector $actions)` continue to work.

### For New Actions
Choose between:

1. **Original API**: Override `handle()` method
2. **Simplified API**: Override `handleWithContext()` method

### For Client Code
Choose between:

1. **Original API**: Use `executeActionWithCallback()`
2. **Simplified API**: Use `executeActionWithContext()`

Both approaches provide identical functionality and can be used interchangeably.