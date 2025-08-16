var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import axios from 'axios';
import { ClientWritesCollector, createWritesProxy } from './writes-collector';
export class ChorusActionsAPI {
    constructor(baseURL = '/api', axiosConfig, chorusCore) {
        this.cache = new Map();
        this.chorusCore = null;
        this.baseURL = baseURL;
        this.chorusCore = chorusCore || null;
        this.axios = axios.create(Object.assign({ baseURL, headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            } }, axiosConfig));
        // Add CSRF token handling for Laravel
        this.setupCSRFHandling();
        // Set up automatic offline sync when coming back online
        this.setupOfflineSync();
    }
    setupCSRFHandling() {
        var _a;
        // Get CSRF token from meta tag or cookie
        const token = (_a = document.querySelector('meta[name="csrf-token"]')) === null || _a === void 0 ? void 0 : _a.getAttribute('content');
        if (token) {
            this.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
        }
    }
    setupOfflineSync() {
        // Listen for when the browser comes back online
        window.addEventListener('online', () => {
            console.log('[ChorusActionsAPI] Network restored, attempting to sync offline actions...');
            this.syncOfflineActions().catch(error => {
                console.error('[ChorusActionsAPI] Failed to sync offline actions after coming online:', error);
            });
        });
        // Also sync when the page becomes visible (user returns to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && navigator.onLine) {
                const offlineActions = JSON.parse(localStorage.getItem('chorus_offline_actions') || '[]');
                if (offlineActions.length > 0) {
                    console.log('[ChorusActionsAPI] Page visible and online, syncing offline actions...');
                    this.syncOfflineActions().catch(error => {
                        console.error('[ChorusActionsAPI] Failed to sync offline actions on visibility change:', error);
                    });
                }
            }
        });
    }
    /**
     * Set the ChorusCore instance for database integration
     */
    setChorusCore(chorusCore) {
        this.chorusCore = chorusCore;
    }
    /**
     * Get the current ChorusCore instance
     */
    getChorusCore() {
        return this.chorusCore;
    }
    /**
     * Execute a ChorusAction with callback-style writes collection
     */
    executeActionWithCallback(actionName_1, callback_1) {
        return __awaiter(this, arguments, void 0, function* (actionName, callback, options = {}) {
            var _a;
            const collector = new ClientWritesCollector();
            const writesProxy = createWritesProxy(collector);
            // Collect writes by executing the callback and capture return value
            collector.startCollecting();
            let callbackData = undefined;
            try {
                callbackData = callback(writesProxy);
            }
            finally {
                collector.stopCollecting();
            }
            const operations = collector.getOperations();
            // Convert operations to the format expected by the server
            const requestData = Object.assign({ operations: operations }, (callbackData && typeof callbackData === 'object' ? { data: callbackData } : {}));
            const endpoint = `/actions/${actionName}`;
            try {
                // Handle offline mode
                if (options.offline && this.isOffline()) {
                    return this.handleOfflineActionWithDelta(actionName, operations, callbackData);
                }
                // Handle optimistic updates for online requests
                if (options.optimistic) {
                    this.handleOptimisticUpdates(operations, actionName, callbackData);
                }
                const response = yield this.axios.post(endpoint, requestData);
                if (response.data.success) {
                    // Mark deltas as synced if we have them
                    if (options.optimistic) {
                        yield this.markDeltasAsSynced(actionName);
                    }
                    // Cache successful responses for offline support
                    this.cacheResponse(`${actionName}:${JSON.stringify(operations)}`, response.data);
                }
                return response.data;
            }
            catch (error) {
                // Rollback optimistic updates on failure
                if (options.optimistic) {
                    yield this.rollbackOptimisticUpdates(operations);
                }
                // Handle network errors
                if (this.isNetworkError(error)) {
                    return this.handleOfflineActionWithDelta(actionName, operations, callbackData);
                }
                // Handle validation errors
                if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 422) {
                    return {
                        success: false,
                        error: 'Validation failed',
                        // @ts-ignore
                        validation_errors: error.response.data.validation_errors,
                    };
                }
                throw error;
            }
        });
    }
    /**
     * Execute a ChorusAction (legacy method)
     */
    executeAction(actionName_1, params_1) {
        return __awaiter(this, arguments, void 0, function* (actionName, params, options = {}) {
            var _a;
            const endpoint = `/actions/${actionName}`;
            try {
                // Handle offline mode
                if (options.offline && this.isOffline()) {
                    return this.handleOfflineAction(actionName, params, options);
                }
                // Handle optimistic updates
                if (options.optimistic) {
                    this.handleOptimisticUpdate(actionName, params);
                }
                const response = yield this.axios.post(endpoint, params);
                if (response.data.success) {
                    // Cache successful responses for offline support
                    this.cacheResponse(`${actionName}:${JSON.stringify(params)}`, response.data);
                }
                return response.data;
            }
            catch (error) {
                // Handle network errors
                if (this.isNetworkError(error)) {
                    return this.handleOfflineAction(actionName, params, options);
                }
                // Handle validation errors
                if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 422) {
                    return {
                        success: false,
                        error: 'Validation failed',
                        // @ts-ignore
                        validation_errors: error.response.data.validation_errors,
                    };
                }
                throw error;
            }
        });
    }
    /**
     * Execute a batch of actions
     */
    executeBatch(actionName_1, items_1) {
        return __awaiter(this, arguments, void 0, function* (actionName, items, options = {}) {
            const endpoint = `/actions/${actionName}`;
            try {
                if (options.optimistic) {
                    items.forEach(item => this.handleOptimisticUpdate(actionName, item));
                }
                const response = yield this.axios.post(endpoint, {
                    batch: items
                });
                return response.data;
            }
            catch (error) {
                if (this.isNetworkError(error) && options.offline) {
                    return this.handleOfflineBatch(actionName, items);
                }
                throw error;
            }
        });
    }
    /**
     * Create a typed action client (legacy method)
     */
    createActionClient(actionMeta = {}) {
        const client = {};
        for (const [actionName, meta] of Object.entries(actionMeta)) {
            // Create a function for each action
            client[actionName] = (params, options) => {
                return this.executeAction(actionName, params, Object.assign({ optimistic: meta.allowOfflineWrites, offline: meta.allowOfflineWrites }, options));
            };
        }
        return client;
    }
    handleOptimisticUpdate(actionName, params) {
        // Emit optimistic update event for UI to handle
        window.dispatchEvent(new CustomEvent('chorus:optimistic-update', {
            detail: { actionName, params }
        }));
    }
    handleOptimisticUpdates(operations, actionName, actionData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.chorusCore) {
                // Fallback to event emission if no ChorusCore is available
                operations.forEach(operation => {
                    window.dispatchEvent(new CustomEvent('chorus:optimistic-operation', {
                        detail: operation
                    }));
                });
                return;
            }
            const db = this.chorusCore.getDb();
            if (!db || !this.chorusCore.getIsInitialized()) {
                console.warn('[ChorusActionsAPI] Cannot perform optimistic updates: database not ready');
                return;
            }
            // Process each operation and write to delta/shadow tables
            for (const operation of operations) {
                try {
                    yield this.writeOptimisticOperation(db, operation, actionName, actionData);
                }
                catch (error) {
                    console.error('[ChorusActionsAPI] Failed to write optimistic operation:', operation, error);
                }
            }
        });
    }
    writeOptimisticOperation(db, operation, actionName, actionData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { table, operation: operationType, data } = operation;
            const deltaTableName = `${table}_deltas`;
            const shadowTableName = `${table}_shadow`;
            // Write to delta table for tracking with action metadata
            const deltaEntry = {
                operation: operationType,
                data: data,
                sync_status: 'pending',
                timestamp: operation.timestamp || Date.now(),
                action_name: actionName || null,
                action_data: actionData ? JSON.stringify(actionData) : null,
            };
            yield db.table(deltaTableName).add(deltaEntry);
            // Handle optimistic updates to shadow table for immediate UI feedback
            switch (operationType) {
                case 'create':
                    // Add new record to shadow table
                    yield db.table(shadowTableName).put(data);
                    break;
                case 'update':
                    if (!data.id) {
                        console.warn('[ChorusActionsAPI] Update operation missing id:', data);
                        break;
                    }
                    // Update existing record in shadow table, or create if doesn't exist
                    const existing = yield db.table(shadowTableName).get(data.id);
                    if (existing) {
                        yield db.table(shadowTableName).put(Object.assign(Object.assign({}, existing), data));
                    }
                    else {
                        // If not in shadow, get from main table and update
                        const mainRecord = yield db.table(table).get(data.id);
                        if (mainRecord) {
                            yield db.table(shadowTableName).put(Object.assign(Object.assign({}, mainRecord), data));
                        }
                    }
                    break;
                case 'delete':
                    if (!data.id) {
                        console.warn('[ChorusActionsAPI] Delete operation missing id:', data);
                        break;
                    }
                    // Remove from shadow table
                    yield db.table(shadowTableName).delete(data.id);
                    break;
            }
            console.log(`[ChorusActionsAPI] Optimistic ${operationType} written for ${table}:`, data);
        });
    }
    handleOfflineActionWithDelta(actionName, operations, actionData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Store optimistic updates in deltas with action metadata
            if (this.chorusCore) {
                yield this.handleOptimisticUpdates(operations, actionName, actionData);
            }
            console.log(`[ChorusActionsAPI] Stored ${operations.length} operations offline for action: ${actionName}`);
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
        });
    }
    handleOfflineActionWithOperations(actionName, operations) {
        return __awaiter(this, void 0, void 0, function* () {
            // Store action for later sync
            this.storeOfflineActionWithOperations(actionName, operations);
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
        });
    }
    handleOfflineAction(actionName, params, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // Store action for later sync
            this.storeOfflineAction(actionName, params);
            // Return optimistic response
            return {
                success: true,
                operations: [{
                        success: true,
                        index: 0,
                        operation: {
                            table: 'offline',
                            operation: actionName,
                            data: params,
                        },
                        data: params,
                    }],
                summary: {
                    total: 1,
                    successful: 1,
                    failed: 0,
                },
            };
        });
    }
    handleOfflineBatch(actionName, items) {
        return __awaiter(this, void 0, void 0, function* () {
            items.forEach(item => this.storeOfflineAction(actionName, item));
            return {
                success: true,
                operations: items.map((item, index) => ({
                    success: true,
                    index,
                    operation: {
                        table: 'offline',
                        operation: actionName,
                        data: item,
                    },
                    data: item,
                })),
                summary: {
                    total: items.length,
                    successful: items.length,
                    failed: 0,
                },
            };
        });
    }
    markDeltasAsSynced(actionName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.chorusCore) {
                console.warn('[ChorusActionsAPI] Cannot mark deltas as synced: no ChorusCore instance');
                return;
            }
            const db = this.chorusCore.getDb();
            if (!db || !this.chorusCore.getIsInitialized()) {
                console.warn('[ChorusActionsAPI] Cannot mark deltas as synced: database not ready');
                return;
            }
            // Get all delta table names from the database schema
            const tableNames = db.tables.map(table => table.name);
            const deltaTableNames = tableNames.filter(name => name.endsWith('_deltas'));
            for (const deltaTableName of deltaTableNames) {
                try {
                    // Find all pending deltas for this action
                    const pendingDeltas = yield db.table(deltaTableName)
                        .where('action_name')
                        .equals(actionName)
                        .and(delta => delta.sync_status === 'pending')
                        .toArray();
                    // Mark them as synced
                    for (const delta of pendingDeltas) {
                        yield db.table(deltaTableName).update(delta.id, {
                            sync_status: 'synced',
                            synced_at: Date.now()
                        });
                    }
                    if (pendingDeltas.length > 0) {
                        console.log(`[ChorusActionsAPI] Marked ${pendingDeltas.length} deltas as synced in ${deltaTableName}`);
                    }
                }
                catch (error) {
                    console.error(`[ChorusActionsAPI] Failed to mark deltas as synced in ${deltaTableName}:`, error);
                }
            }
        });
    }
    markDeltasAsFailed(actionName, errorMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.chorusCore) {
                console.warn('[ChorusActionsAPI] Cannot mark deltas as failed: no ChorusCore instance');
                return;
            }
            const db = this.chorusCore.getDb();
            if (!db || !this.chorusCore.getIsInitialized()) {
                console.warn('[ChorusActionsAPI] Cannot mark deltas as failed: database not ready');
                return;
            }
            // Get all delta table names from the database schema
            const tableNames = db.tables.map(table => table.name);
            const deltaTableNames = tableNames.filter(name => name.endsWith('_deltas'));
            for (const deltaTableName of deltaTableNames) {
                try {
                    // Find all pending deltas for this action
                    const pendingDeltas = yield db.table(deltaTableName)
                        .where('action_name')
                        .equals(actionName)
                        .and(delta => delta.sync_status === 'pending')
                        .toArray();
                    // Mark them as failed
                    for (const delta of pendingDeltas) {
                        yield db.table(deltaTableName).update(delta.id, {
                            sync_status: 'failed',
                            failed_at: Date.now(),
                            error_message: errorMessage
                        });
                    }
                    if (pendingDeltas.length > 0) {
                        console.log(`[ChorusActionsAPI] Marked ${pendingDeltas.length} deltas as failed in ${deltaTableName}`);
                    }
                }
                catch (error) {
                    console.error(`[ChorusActionsAPI] Failed to mark deltas as failed in ${deltaTableName}:`, error);
                }
            }
        });
    }
    storeOfflineAction(actionName, params) {
        const offlineActions = JSON.parse(localStorage.getItem('chorus_offline_actions') || '[]');
        offlineActions.push({
            actionName,
            params,
            timestamp: Date.now(),
        });
        localStorage.setItem('chorus_offline_actions', JSON.stringify(offlineActions));
    }
    storeOfflineActionWithOperations(actionName, operations) {
        const offlineActions = JSON.parse(localStorage.getItem('chorus_offline_actions') || '[]');
        offlineActions.push({
            actionName,
            operations,
            timestamp: Date.now(),
        });
        localStorage.setItem('chorus_offline_actions', JSON.stringify(offlineActions));
    }
    cacheResponse(key, response) {
        this.cache.set(key, response);
    }
    isOffline() {
        return !navigator.onLine;
    }
    isNetworkError(error) {
        return !error.response || error.code === 'NETWORK_ERROR';
    }
    /**
     * Rollback optimistic updates for failed operations
     */
    rollbackOptimisticUpdates(operations) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.chorusCore) {
                console.warn('[ChorusActionsAPI] Cannot rollback: no ChorusCore instance');
                return;
            }
            const db = this.chorusCore.getDb();
            if (!db || !this.chorusCore.getIsInitialized()) {
                console.warn('[ChorusActionsAPI] Cannot rollback: database not ready');
                return;
            }
            // Process each operation and rollback optimistic changes
            for (const operation of operations) {
                try {
                    yield this.rollbackOptimisticOperation(db, operation);
                }
                catch (error) {
                    console.error('[ChorusActionsAPI] Failed to rollback optimistic operation:', operation, error);
                }
            }
        });
    }
    rollbackOptimisticOperation(db, operation) {
        return __awaiter(this, void 0, void 0, function* () {
            const { table, operation: operationType, data } = operation;
            const deltaTableName = `${table}_deltas`;
            const shadowTableName = `${table}_shadow`;
            // Find and mark the corresponding delta as rejected
            const pendingDeltas = yield db.table(deltaTableName)
                .where('sync_status')
                .equals('pending')
                .toArray();
            for (const delta of pendingDeltas) {
                if (JSON.stringify(delta.data) === JSON.stringify(data)) {
                    yield db.table(deltaTableName).update(delta.id, {
                        sync_status: 'rejected',
                        rejected_reason: 'Action failed on server'
                    });
                    break;
                }
            }
            // Remove optimistic changes from shadow table
            switch (operationType) {
                case 'create':
                    if (data.id) {
                        yield db.table(shadowTableName).delete(data.id);
                    }
                    break;
                case 'update':
                    if (data.id) {
                        // Restore original record from main table to shadow
                        const originalRecord = yield db.table(table).get(data.id);
                        if (originalRecord) {
                            yield db.table(shadowTableName).put(originalRecord);
                        }
                        else {
                            yield db.table(shadowTableName).delete(data.id);
                        }
                    }
                    break;
                case 'delete':
                    if (data.id) {
                        // Restore the deleted record to shadow table from main table
                        const originalRecord = yield db.table(table).get(data.id);
                        if (originalRecord) {
                            yield db.table(shadowTableName).put(originalRecord);
                        }
                    }
                    break;
            }
            console.log(`[ChorusActionsAPI] Optimistic ${operationType} rolled back for ${table}:`, data);
        });
    }
    /**
     * Sync offline actions when coming back online using delta tables
     */
    syncOfflineActions() {
        return __awaiter(this, void 0, void 0, function* () {
            // Try delta-based sync first (new method)
            if (this.chorusCore) {
                yield this.syncOfflineActionsFromDeltas();
            }
            // Fallback to legacy localStorage sync for any remaining actions
            yield this.syncOfflineActionsFromLocalStorage();
        });
    }
    /**
     * Sync offline actions from delta tables (new delta-based approach)
     */
    syncOfflineActionsFromDeltas() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.chorusCore) {
                console.warn('[ChorusActionsAPI] Cannot sync from deltas: no ChorusCore instance');
                return;
            }
            const db = this.chorusCore.getDb();
            if (!db || !this.chorusCore.getIsInitialized()) {
                console.warn('[ChorusActionsAPI] Cannot sync from deltas: database not ready');
                return;
            }
            // Get all delta table names
            const tableNames = db.tables.map(table => table.name);
            const deltaTableNames = tableNames.filter(name => name.endsWith('_deltas'));
            // Collect all pending deltas grouped by action name
            const pendingActionGroups = new Map();
            for (const deltaTableName of deltaTableNames) {
                try {
                    const pendingDeltas = yield db.table(deltaTableName)
                        .where('sync_status')
                        .equals('pending')
                        .and(delta => delta.action_name)
                        .toArray();
                    for (const delta of pendingDeltas) {
                        const tableName = deltaTableName.replace('_deltas', '');
                        const actionName = delta.action_name;
                        if (!pendingActionGroups.has(actionName)) {
                            pendingActionGroups.set(actionName, { operations: [], actionData: undefined });
                        }
                        const group = pendingActionGroups.get(actionName);
                        // Add the operation
                        group.operations.push({
                            table: tableName,
                            operation: delta.operation,
                            data: delta.data,
                            timestamp: delta.timestamp
                        });
                        // Capture action data (should be the same for all deltas of the same action)
                        if (delta.action_data && !group.actionData) {
                            try {
                                group.actionData = JSON.parse(delta.action_data);
                            }
                            catch (error) {
                                console.warn('[ChorusActionsAPI] Failed to parse action_data:', delta.action_data);
                            }
                        }
                    }
                }
                catch (error) {
                    console.error(`[ChorusActionsAPI] Failed to read pending deltas from ${deltaTableName}:`, error);
                }
            }
            if (pendingActionGroups.size === 0) {
                return;
            }
            console.log(`[ChorusActionsAPI] Syncing ${pendingActionGroups.size} action types from deltas...`);
            // Sync each action with all its operations in one request
            for (const [actionName, group] of pendingActionGroups) {
                try {
                    // Send all operations for this action - let server determine execution grouping
                    const requestData = Object.assign({ operations: group.operations }, (group.actionData && { data: group.actionData }));
                    const endpoint = `/actions/${actionName}`;
                    const response = yield this.axios.post(endpoint, requestData);
                    if (response.data.success) {
                        console.log(`[ChorusActionsAPI] Successfully synced action: ${actionName} with ${group.operations.length} operations`);
                        yield this.markDeltasAsSynced(actionName);
                    }
                    else {
                        console.error(`[ChorusActionsAPI] Failed to sync action: ${actionName}`, response.data.error);
                        yield this.markDeltasAsFailed(actionName, response.data.error || 'Unknown error');
                    }
                }
                catch (error) {
                    console.error(`[ChorusActionsAPI] Failed to sync action: ${actionName}`, error);
                    yield this.markDeltasAsFailed(actionName, error instanceof Error ? error.message : 'Unknown error');
                }
            }
        });
    }
    /**
     * Legacy localStorage-based sync for backwards compatibility
     */
    syncOfflineActionsFromLocalStorage() {
        return __awaiter(this, void 0, void 0, function* () {
            const offlineActions = JSON.parse(localStorage.getItem('chorus_offline_actions') || '[]');
            if (offlineActions.length === 0)
                return;
            console.log(`[ChorusActionsAPI] Syncing ${offlineActions.length} offline actions from localStorage...`);
            const synced = [];
            const failed = [];
            for (const action of offlineActions) {
                try {
                    let result;
                    // Handle new operations format
                    if (action.operations && Array.isArray(action.operations)) {
                        // Recreate the callback that would generate these operations
                        const callback = (writes) => {
                            action.operations.forEach((op) => {
                                const tableProxy = writes[op.table];
                                if (tableProxy && typeof tableProxy[op.operation] === 'function') {
                                    tableProxy[op.operation](op.data);
                                }
                            });
                        };
                        result = yield this.executeActionWithCallback(action.actionName, callback, {
                            offline: false,
                            optimistic: false // Don't do optimistic updates during sync
                        });
                    }
                    // Handle legacy params format
                    else if (action.params) {
                        result = yield this.executeAction(action.actionName, action.params, { offline: false });
                    }
                    else {
                        console.warn('[ChorusActionsAPI] Skipping malformed offline action:', action);
                        failed.push(action);
                        continue;
                    }
                    if (result.success) {
                        synced.push(action);
                        console.log(`[ChorusActionsAPI] Successfully synced offline action: ${action.actionName}`);
                    }
                    else {
                        failed.push(action);
                        console.error(`[ChorusActionsAPI] Failed to sync offline action: ${action.actionName}`, result.error);
                    }
                }
                catch (error) {
                    failed.push(action);
                    console.error('[ChorusActionsAPI] Failed to sync offline action:', action, error);
                }
            }
            // Only clear successfully synced actions
            if (synced.length > 0) {
                if (failed.length === 0) {
                    // All actions synced successfully, clear storage
                    localStorage.removeItem('chorus_offline_actions');
                    console.log(`[ChorusActionsAPI] All ${synced.length} offline actions synced successfully`);
                }
                else {
                    // Some actions failed, keep only the failed ones
                    localStorage.setItem('chorus_offline_actions', JSON.stringify(failed));
                    console.log(`[ChorusActionsAPI] ${synced.length} actions synced, ${failed.length} actions remain offline`);
                }
            }
        });
    }
}
/**
 * Global ChorusActionsAPI instance for integration
 */
let globalChorusActionsAPI = null;
/**
 * Get or create the global ChorusActionsAPI instance
 */
export function getGlobalChorusActionsAPI() {
    if (!globalChorusActionsAPI) {
        globalChorusActionsAPI = new ChorusActionsAPI();
    }
    return globalChorusActionsAPI;
}
/**
 * Connect ChorusActionsAPI with ChorusCore for optimistic updates
 */
export function connectChorusActionsAPI(chorusCore, chorusActionsAPI) {
    const api = chorusActionsAPI || getGlobalChorusActionsAPI();
    api.setChorusCore(chorusCore);
    console.log('[Chorus] ChorusActionsAPI connected to ChorusCore');
    // Trigger initial sync if we're online and have pending actions
    if (navigator.onLine) {
        const offlineActions = JSON.parse(localStorage.getItem('chorus_offline_actions') || '[]');
        if (offlineActions.length > 0) {
            console.log('[ChorusActionsAPI] Found pending offline actions on initialization, syncing...');
            api.syncOfflineActions().catch(error => {
                console.error('[ChorusActionsAPI] Failed to sync offline actions on initialization:', error);
            });
        }
    }
}
