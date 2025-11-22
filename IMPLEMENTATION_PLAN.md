# Shadow Item Resolution Implementation Plan

## Problem Statement
Currently, shadow items (optimistic UI items) are not being removed when harmonics arrive, even though deltas are being marked as synced. The React and Vue adapters both contain duplicate logic for:
1. Matching incoming harmonics to pending deltas by record ID
2. Updating delta sync_status
3. Deleting corresponding shadow items

This logic should be centralized in chorus-core to avoid duplication and ensure consistency.

## Implementation Phases

### Phase 1: Extend chorus-core's processHarmonic Method

**Goal:** Add shadow item cleanup logic directly to the core harmonic processing

**Files to Modify:**
- `packages/chorus-core/src/chorus.ts` - `processHarmonic()` method

**Changes:**
1. After applying the harmonic (create/update/delete in main table)
2. Extract the record ID from the harmonic (`event.record_id`)
3. Look for matching pending deltas in the `{tableName}_deltas` table where `delta.data.id === recordId`
4. Update the matching delta's `sync_status` to "synced" (or "rejected" if applicable)
5. Delete the matching item from the `{tableName}_shadow` table
6. Handle edge cases:
   - No matching delta found (harmonic arrived without prior optimistic update)
   - Shadow table doesn't exist yet
   - Database errors during cleanup

**Pseudocode:**
```typescript
// In processHarmonic(), after handling create/update/delete
const recordId = event.record_id; // or extract from data
const deltaTableName = `${tableName}_deltas`;
const shadowTableName = `${tableName}_shadow`;

// Find matching pending delta
const pendingDeltas = await db.table(deltaTableName)
  .where('sync_status')
  .equals('pending')
  .toArray();

for (const delta of pendingDeltas) {
  if (delta.data.id === recordId) {
    // Update delta sync status
    await db.table(deltaTableName).update(delta.id, {
      sync_status: event.rejected ? 'rejected' : 'synced',
      ...(event.rejected_reason && { rejected_reason: event.rejected_reason })
    });

    // Remove shadow item if not rejected
    if (!event.rejected) {
      await db.table(shadowTableName).delete(recordId);
    }
    break;
  }
}
```

**Testing:**
- Unit test: Verify shadow item is deleted when harmonic arrives with matching ID
- Unit test: Verify delta sync_status is updated correctly
- Unit test: Verify no error if shadow table doesn't exist
- Unit test: Verify rejected harmonics don't delete shadow items

---

### Phase 2: Update React Adapter

**Goal:** Replace React adapter's duplicate logic with chorus-core implementation

**Files to Modify:**
- `packages/chorus-react/src/providers/ChorusProvider.tsx`

**Changes:**
1. Remove the delta/shadow matching logic from the harmonic event handler
2. Remove the `shadowTable.delete()` and `deltaTable.update()` calls
3. The core's `processHarmonic()` now handles this automatically
4. Keep only the UI update logic:
   - Update table states
   - Trigger re-render
   - Call onRejectedHarmonic callback if needed

**Before:**
```typescript
// Find matching delta and update/delete shadow (DUPLICATED LOGIC)
const pendingDeltas = await deltaTable
  .where("sync_status")
  .equals("pending")
  .toArray();

for (const delta of pendingDeltas) {
  if (delta.data.id === eventData.id) {
    await deltaTable.update(delta.id, { sync_status: "synced" });
    if (!event.rejected) {
      await shadowTable.delete(delta.data.id);
    }
    break;
  }
}
```

**After:**
```typescript
// Core already handles delta/shadow cleanup
// Just update UI state
setTables(chorusCore.getAllTableStates());
```

**Testing:**
- Verify shadow items still disappear after harmonic arrives
- Verify deltas are still marked as synced
- Verify no regression in existing React tests

---

### Phase 3: Update Vue Adapter

**Goal:** Replace Vue adapter's duplicate logic with chorus-core implementation

**Files to Modify:**
- `packages/chorus-vue/src/composables/useChorus.ts`
- `packages/chorus-vue/src/ChorusProvider.vue` (if applicable)

**Changes:**
1. Remove any delta/shadow matching logic from harmonic handlers
2. Remove explicit `shadowTable.delete()` calls
3. Rely on chorus-core's `processHarmonic()` to handle cleanup
4. Keep only the Vue reactivity updates

**Testing:**
- Verify shadow items still disappear after harmonic arrives
- Verify no regression in existing Vue tests

---

### Phase 4: Update Alpine Adapter

**Goal:** Verify Alpine adapter works correctly with centralized logic

**Files to Check:**
- `packages/chorus-alpine/src/index.ts`

**Changes:**
1. Alpine already calls `processHarmonic()` which will now include shadow cleanup
2. No changes needed in Alpine code itself
3. Verify the existing flow works end-to-end:
   - Optimistic item added to shadow table
   - Livewire action completes
   - Harmonic arrives
   - Shadow item removed
   - UI updated

**Testing:**
- Test the complete flow: create todo → harmonic arrives → shadow disappears

---

## Implementation Order

1. **Phase 1 (chorus-core)** - Add shadow cleanup to `processHarmonic()`
2. **Phase 4 (Alpine)** - Test end-to-end with existing implementation
3. **Phase 2 (React)** - Remove duplicate logic
4. **Phase 3 (Vue)** - Remove duplicate logic

## Rollback Strategy

If issues arise:
1. Keep git commits atomic for each phase
2. Can revert individual adapter changes without affecting others
3. Core changes are backwards compatible (adapters just do extra work)

## Success Criteria

- [ ] Shadow items are removed when harmonics arrive in Alpine (Phase 1 + 4)
- [ ] React adapter still works after removing duplicate logic (Phase 2)
- [ ] Vue adapter still works after removing duplicate logic (Phase 3)
- [ ] No delta/shadow logic duplication across adapters
- [ ] All existing tests pass
- [ ] New chorus-core tests verify shadow cleanup behavior

---

# Offline Write Support for chorus-alpine Implementation Plan

## Problem Statement

The chorus-alpine adapter needs offline write support where:
1. When offline, Livewire requests should be prevented from being sent
2. Method calls should be cached (not HTTP requests with stale tokens)
3. When back online, cached method calls should be automatically replayed
4. Optimistic updates (shadow/delta) should work seamlessly

## Key Insight

Instead of caching HTTP requests (which contain stale CSRF tokens and headers), cache the high-level **method call** (component ID, method name, parameters). This allows Livewire to construct fresh requests with current tokens when replaying.

```
❌ Cache HTTP request: { url, headers: {CSRF: 'abc123'}, body }
✅ Cache method call: { componentId, methodName, params: [operations] }
```

## Implementation Phases

### Phase 1: Add Method Call Cache Helpers
**File:** `packages/chorus-alpine/src/index.ts`

Add TypeScript interface and helper functions:
```typescript
interface OfflineLivewireCall {
  componentId: string;
  methodName: string;
  params: any[];
  timestamp: number;
}

function getOfflineLivewireCalls(): OfflineLivewireCall[] {
  const stored = localStorage.getItem('chorus_offline_livewire_calls');
  return stored ? JSON.parse(stored) : [];
}

function cacheOfflineLivewireCall(call: OfflineLivewireCall): void {
  const calls = getOfflineLivewireCalls();
  calls.push(call);
  localStorage.setItem('chorus_offline_livewire_calls', JSON.stringify(calls));
}

function clearOfflineLivewireCalls(): void {
  localStorage.removeItem('chorus_offline_livewire_calls');
}
```

### Phase 2: Add Livewire Request Interceptor
**File:** `packages/chorus-alpine/src/index.ts`

Add safety net to abort any requests that slip through when offline:
```typescript
function setupLivewireRequestInterceptor(): void {
  if (!window.Livewire) {
    console.warn('[Chorus] Livewire not available for request interception');
    return;
  }

  window.Livewire.interceptRequest(({ abort }) => {
    if (!offlineManager.getIsOnline()) {
      console.log('[Chorus] Aborting Livewire request (offline)');
      abort();
    }
  });
}
```

Call this during `livewire:init`:
```typescript
document.addEventListener("livewire:init", function () {
  console.log("[Chorus] livewire:init event fired");
  setupLivewireRequestInterceptor();
  // ... rest of existing code
});
```

### Phase 3: Update $harmonize to Cache Method Calls
**File:** `packages/chorus-alpine/src/index.ts`

Modify the `$harmonize` magic method to cache method calls when offline:
```typescript
// Check if we're offline before calling Livewire
if (!offlineManager.getIsOnline()) {
  console.log('[Chorus] Offline: Caching method call for replay');

  // Perform optimistic updates (shadow/delta)
  try {
    await (chorusActionsAPI as any).handleOptimisticUpdates?.(
      operations,
      actionName,
      {}
    );
  } catch (error) {
    console.warn("[Chorus] Failed to apply optimistic updates:", error);
  }

  // Cache the method call for replay when online
  cacheOfflineLivewireCall({
    componentId: livewireId,
    methodName: actionName,
    params: [operations],
    timestamp: Date.now()
  });

  // Return optimistic response immediately
  return {
    success: true,
    operations: operations.map((op, index) => ({
      success: true,
      index,
      operation: {
        table: op.table,
        operation: op.operation,
        data: op.data,
      },
      data: op.data,
    })),
    summary: {
      total: operations.length,
      successful: operations.length,
      failed: 0,
    },
  };
}

// Online: proceed with normal Livewire call
try {
  console.log(`[Chorus] Calling $wire.${actionName} with operations`);
  const response = await $wire[actionName](operations);

  // Mark deltas as synced after successful server response
  console.log(`[Chorus] Marking deltas as synced for action: ${actionName}`);
  try {
    await (chorusActionsAPI as any).markDeltasAsSynced?.(actionName);
  } catch (syncError) {
    console.warn("[Chorus] Failed to mark deltas as synced:", syncError);
  }

  // Refresh affected table proxies after successful response
  const affectedTables = new Set(operations.map((op) => op.table));
  affectedTables.forEach((tableName) => {
    const proxy = tableProxies.get(tableName);
    if (proxy) {
      proxy.refreshData();
    }
  });

  return response;
} catch (error) {
  // Rollback optimistic updates on error
  try {
    await (chorusActionsAPI as any).rollbackOptimisticUpdates?.(operations);
  } catch (rollbackError) {
    console.warn("[Chorus] Failed to rollback optimistic updates:", rollbackError);
  }

  console.error(`[Chorus] Failed to execute Livewire action ${actionName}:`, error);
  throw error;
}
```

### Phase 4: Update setupHarmonizeComponent
**File:** `packages/chorus-alpine/src/index.ts`

Apply the same offline caching logic to the `setupHarmonizeComponent` function's wrapped method:
```typescript
// Check if we're offline before making the request
if (!offlineManager.getIsOnline()) {
  console.log("[Chorus] Browser is offline, caching method call");

  // Perform optimistic updates
  try {
    await (chorusActionsAPI as any).handleOptimisticUpdates?.(
      operations,
      actionName,
      {}
    );
  } catch (error) {
    console.warn("[Chorus] Failed to apply optimistic updates:", error);
  }

  // Cache the method call
  cacheOfflineLivewireCall({
    componentId: component.$id || 'unknown',
    methodName: actionName,
    params: [operations],
    timestamp: Date.now()
  });

  // Return optimistic response
  return {
    success: true,
    operations: operations.map((op, index) => ({
      success: true,
      index,
      operation: {
        table: op.table,
        operation: op.operation,
        data: op.data,
      },
      data: op.data,
    })),
    summary: {
      total: operations.length,
      successful: operations.length,
      failed: 0,
    },
  };
}

// Online: proceed with normal call
const response = await original.call(target, operations);
// ... handle success
```

### Phase 5: Update setupOfflineSync for Method Call Replay
**File:** `packages/chorus-alpine/src/index.ts`

Modify the `setupOfflineSync` function to replay cached method calls:
```typescript
function setupOfflineSync(api: ChorusActionsAPI): void {
  offlineManager.onOnline(async () => {
    console.log("[Chorus] Browser came online, processing pending requests and method calls");
    try {
      // Get and replay cached Livewire method calls
      const offlineCalls = getOfflineLivewireCalls();

      if (offlineCalls.length > 0) {
        console.log(`[Chorus] Replaying ${offlineCalls.length} cached method calls`);

        for (const call of offlineCalls) {
          try {
            const component = window.Livewire.find(call.componentId);

            if (component?.$wire) {
              console.log(`[Chorus] Replaying ${call.methodName} for component ${call.componentId}`);
              await component.$wire[call.methodName](...call.params);
            } else {
              console.warn(`[Chorus] Component ${call.componentId} not found for replay`);
            }
          } catch (error) {
            console.error(`[Chorus] Failed to replay ${call.methodName}:`, error);
          }
        }

        clearOfflineLivewireCalls();
      }

      // Process any OfflineManager requests (for consistency)
      await offlineManager.processPendingRequests();

      // Refresh all table proxies after sync
      tableProxies.forEach(proxy => proxy.refreshData());
    } catch (error) {
      console.error("[Chorus] Error processing pending requests:", error);
    }
  });
}
```

### Phase 6: Remove API Endpoint Code
**Files to delete:**
- `examples/alpine-example/routes/api.php`
- `examples/alpine-example/app/Http/Controllers/Api/WriteActionsController.php`

**Reason:** These were created for the previous (incorrect) approach of caching HTTP requests. With method call caching, they're no longer needed.

### Phase 7: Rebuild and Test
**Command:**
```bash
cd packages/chorus-alpine && npm run build
cd ../../examples/alpine-example && npm run build
```

## How It Works End-to-End

1. **User creates todo while offline:**
   - `$harmonize('createTodo', ({ create }) => { create('todos', { ... }) })` called
   - Offline check: `!offlineManager.getIsOnline()` returns true
   - Optimistic updates to shadow/delta tables
   - Method call cached: `{ componentId: 'xyz', methodName: 'createTodo', params: [operations] }`
   - Request interceptor aborts any network attempt
   - Optimistic response returned immediately
   - UI shows the new todo

2. **Browser comes back online:**
   - Window `online` event fires
   - `offlineManager.onOnline()` callback executes
   - Cached method call retrieved: `{ componentId, methodName, params }`
   - Component found via `window.Livewire.find(componentId)`
   - Method replayed: `component.$wire.createTodo(operations)`
   - Fresh Livewire request sent with current CSRF token
   - Server processes the request
   - Harmonics trigger delta sync status update
   - Shadow items are removed
   - UI refreshed with final data

## Advantages

✅ **Fresh tokens** - Method calls are replayed, generating new CSRF tokens
✅ **Native Livewire** - Uses Livewire's `$wire` API, no low-level HTTP manipulation
✅ **Clean separation** - Offline caching is independent from HTTP layer
✅ **Graceful ordering** - Method calls replayed in order they were made
✅ **Component lifecycle aware** - Uses Livewire's component lookup
✅ **No API endpoints** - Works with existing Livewire action routes

## Testing Checklist

- [ ] Go offline in Chrome DevTools
- [ ] Create a todo → see optimistic update in UI
- [ ] Network tab shows NO requests attempted to `/livewire/update`
- [ ] Request interceptor log shows abort message
- [ ] localStorage contains `chorus_offline_livewire_calls` with method call
- [ ] IndexedDB contains `todos_shadow` and `todos_deltas` entries with correct sync_status
- [ ] Go online
- [ ] Automatic Livewire request to `/livewire/update` sent
- [ ] Delta sync_status updated to 'synced' via harmonic
- [ ] Shadow item removed
- [ ] Todo persists in main `todos` table
- [ ] No console errors

## Success Criteria

- [ ] Method calls are cached when offline (not HTTP requests)
- [ ] Request interceptor prevents Livewire requests when offline
- [ ] Cached calls are replayed when online with fresh tokens
- [ ] Optimistic updates work seamlessly throughout flow
- [ ] All existing Alpine adapter tests pass
- [ ] No API endpoints needed (fully Livewire-native)