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