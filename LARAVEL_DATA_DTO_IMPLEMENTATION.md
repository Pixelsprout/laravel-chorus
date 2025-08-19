# Laravel Chorus - Laravel Data DTO Implementation

This document demonstrates the complete implementation of Laravel Data DTOs for the simplified Chorus action API, providing type-safe data handling across PHP and TypeScript.

## Overview

The implementation uses **Spatie Laravel Data** to create strongly-typed DTOs that:
- ✅ **Automatic validation** via PHP attributes
- ✅ **Type safety** across PHP and TypeScript
- ✅ **Request parsing** from nested operation structures  
- ✅ **TypeScript generation** for frontend integration
- ✅ **Clean API** for action implementations

## Implementation Structure

### 1. **Individual Operation DTOs**

#### CreateMessageData.php
```php
#[TypeScript]
final class CreateMessageData extends Data
{
    public function __construct(
        #[Uuid] public ?string $id,
        #[Required, StringType, Max(1000)] public string $body,
        #[Required, StringType, Uuid, Exists('platforms', 'id')] public string $platform_id,
        #[Required, StringType, Uuid, Exists('users', 'id')] public string $user_id,
        #[Required] public int $tenant_id,
    ) {}
}
```

#### UpdateUserData.php
```php
#[TypeScript]
final class UpdateUserData extends Data
{
    public function __construct(
        #[Required, StringType, Uuid, Exists('users', 'id')] public string $id,
        #[Required, Date] public string $last_activity_at,
    ) {}
}
```

#### UpdatePlatformData.php
```php
#[TypeScript]
final class UpdatePlatformData extends Data
{
    public function __construct(
        #[Required, StringType, Uuid, Exists('platforms', 'id')] public string $id,
        #[Date] public ?string $last_message_at,
    ) {}
}
```

### 2. **Main Action DTO Wrapper**

#### CreateMessageWithActivityActionData.php
```php
#[TypeScript]
final class CreateMessageWithActivityActionData extends Data
{
    public function __construct(
        public ?CreateMessageData $createMessage,
        public ?UpdateUserData $updateUser,
        public ?UpdatePlatformData $updatePlatform,
        public array $additionalData = [],
    ) {}

    /**
     * Parse from organized request structure
     */
    public static function fromRequest(array $requestData): self
    {
        $operations = $requestData['operations'] ?? [];
        $data = $requestData['data'] ?? [];

        $createMessage = isset($operations['messages.create'][0]) 
            ? CreateMessageData::from($operations['messages.create'][0]) 
            : null;

        $updateUser = isset($operations['users.update'][0]) 
            ? UpdateUserData::from($operations['users.update'][0]) 
            : null;

        $updatePlatform = isset($operations['platforms.update'][0]) 
            ? UpdatePlatformData::from($operations['platforms.update'][0]) 
            : null;

        return new self(
            createMessage: $createMessage,
            updateUser: $updateUser,
            updatePlatform: $updatePlatform,
            additionalData: $data,
        );
    }

    // Helper methods
    public function hasCreateMessage(): bool { return $this->createMessage !== null; }
    public function hasUpdateUser(): bool { return $this->updateUser !== null; }
    public function hasUpdatePlatform(): bool { return $this->updatePlatform !== null; }
    public function getAdditionalDataValue(string $key, mixed $default = null): mixed 
    { 
        return $this->additionalData[$key] ?? $default; 
    }
}
```

### 3. **Updated Action Implementation**

#### CreateMessageWithActivityAction.php
```php
final class CreateMessageWithActivityAction extends ChorusAction
{
    public function handle(Request $request): void
    {
        $user = auth()->user();
        
        if (!$user) {
            throw new \Exception('User must be authenticated');
        }

        // Parse request data using DTOs - Type safety and validation automatically handled
        $actionData = CreateMessageWithActivityActionData::fromRequest($request->all());

        // Log any additional data sent from the client
        if (!empty($actionData->additionalData)) {
            \Log::info('Received additional data from client:', $actionData->additionalData);
        }

        // Create the message using typed DTO data
        if ($actionData->hasCreateMessage()) {
            $messageData = $actionData->createMessage;
            Message::create([
                'id' => $messageData->id,
                'body' => $messageData->body,
                'platform_id' => $messageData->platform_id,
                'user_id' => $user->id,
                'tenant_id' => $user->tenant_id,
            ]);
        }

        // Update user's last activity using typed DTO data
        if ($actionData->hasUpdateUser()) {
            User::where('id', $user->id)->update([
                'last_activity_at' => now(),
            ]);
        }

        // Update platform metrics using typed DTO data
        if ($actionData->hasUpdatePlatform()) {
            $platformData = $actionData->updatePlatform;
            Platform::where('id', $platformData->id)->update([
                'last_message_at' => now(),
            ]);
        }
    }

    // Validation rules still defined for backward compatibility
    public function rules(): array { /* ... */ }
}
```

## Request Flow with DTOs

### 1. **Client Sends Request**
```typescript
// Client-side (TypeScript)
const result = await createMessageWithActivityAction(({ create, update }) => {
  create('messages', {
    body: 'Hello World',
    platform_id: 'platform-123',
    user_id: 'user-123',
    tenant_id: 1,
  });
  
  update('users', {
    id: 'user-123',
    last_activity_at: new Date().toISOString(),
  });
  
  update('platforms', {
    id: 'platform-123',
    last_message_at: new Date().toISOString(),
  });
  
  return { test_item: 'test message' };
});
```

### 2. **Server Receives Organized Request**
```php
// Server receives this structure:
$request = [
    'operations' => [
        'messages.create' => [['body' => 'Hello World', 'platform_id' => 'platform-123', ...]],
        'users.update' => [['id' => 'user-123', 'last_activity_at' => '2024-...']],
        'platforms.update' => [['id' => 'platform-123', 'last_message_at' => '2024-...']]
    ],
    'data' => ['test_item' => 'test message']
];
```

### 3. **DTO Parsing and Validation**
```php
// Automatic parsing and validation
$actionData = CreateMessageWithActivityActionData::fromRequest($request->all());

// Type-safe access with IDE autocomplete
$messageData = $actionData->createMessage; // CreateMessageData|null
$body = $messageData->body; // string (validated)
$platformId = $messageData->platform_id; // string (validated UUID, exists in platforms table)
```

## TypeScript Generation

### 4. **Generated TypeScript Types**
```typescript
// resources/types/generated.d.ts (automatically generated)
declare namespace App.Data {
  export type CreateMessageData = {
    id: string | null;
    body: string;
    platform_id: string;
    user_id: string;
    tenant_id: number;
  };
  
  export type UpdateUserData = {
    id: string;
    last_activity_at: string;
  };
  
  export type UpdatePlatformData = {
    id: string;
    last_message_at: string | null;
  };
  
  export type CreateMessageWithActivityActionData = {
    createMessage: App.Data.CreateMessageData | null;
    updateUser: App.Data.UpdateUserData | null;
    updatePlatform: App.Data.UpdatePlatformData | null;
    additionalData: Array<any>;
  };
}
```

### 5. **Frontend Type Usage**
```typescript
// Frontend can now use these types directly
import type { CreateMessageData } from '@/types/generated';

const messageData: CreateMessageData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  body: 'Hello World',
  platform_id: 'platform-123',
  user_id: 'user-123',
  tenant_id: 1,
};
```

## Benefits Achieved

### ✅ **Type Safety**
- **PHP**: Full IDE autocomplete and type checking
- **TypeScript**: Shared types between backend and frontend
- **Validation**: Automatic validation via PHP attributes

### ✅ **Clean Code**
- **Readable**: `$actionData->createMessage->body` vs `$request->input('operations.messages.create.0.body')`
- **Maintainable**: Single source of truth for data structure
- **Testable**: Easy to mock and test with concrete data

### ✅ **Developer Experience**
- **IDE Support**: Full autocomplete and type hints
- **Error Detection**: Compile-time validation of data access
- **Documentation**: DTOs serve as living documentation

### ✅ **Validation**
- **Automatic**: Laravel Data handles validation based on attributes
- **Comprehensive**: Database existence checks, UUID validation, string length limits
- **Consistent**: Same validation rules used for PHP parsing and TypeScript generation

## Command Reference

```bash
# Generate TypeScript types from DTOs
php artisan typescript:transform

# Create new DTO
php artisan make:data MessageData

# Run DTO tests
./vendor/bin/pest tests/Unit/DTOTest.php
```

## Files Created/Modified

### New Files:
- `app/Data/CreateMessageData.php`
- `app/Data/UpdateUserData.php`  
- `app/Data/UpdatePlatformData.php`
- `app/Data/CreateMessageWithActivityActionData.php`
- `tests/Unit/DTOTest.php`
- `config/typescript-transformer.php`
- `resources/types/generated.d.ts`

### Modified Files:
- `app/Actions/ChorusActions/CreateMessageWithActivityAction.php`
- `composer.json` (added Laravel Data and TypeScript transformer)

This implementation provides a robust, type-safe foundation for data handling across the entire Laravel Chorus application stack, from database validation to frontend TypeScript types.