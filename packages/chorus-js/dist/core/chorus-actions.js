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
    }
    setupCSRFHandling() {
        var _a;
        // Get CSRF token from meta tag or cookie
        const token = (_a = document.querySelector('meta[name="csrf-token"]')) === null || _a === void 0 ? void 0 : _a.getAttribute('content');
        if (token) {
            this.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
        }
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
            // Collect writes by executing the callback
            collector.startCollecting();
            try {
                callback(writesProxy);
            }
            finally {
                collector.stopCollecting();
            }
            const operations = collector.getOperations();
            // Handle optimistic updates first
            if (options.optimistic) {
                this.handleOptimisticUpdates(operations);
            }
            // Convert operations to the format expected by the server
            const requestData = {
                operations: operations,
                // Include any additional metadata needed
            };
            const endpoint = `/actions/${actionName}`;
            try {
                // Handle offline mode
                if (options.offline && this.isOffline()) {
                    return this.handleOfflineActionWithOperations(actionName, operations);
                }
                const response = yield this.axios.post(endpoint, requestData);
                if (response.data.success) {
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
                    return this.handleOfflineActionWithOperations(actionName, operations);
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
    handleOptimisticUpdates(operations) {
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
                    yield this.writeOptimisticOperation(db, operation);
                }
                catch (error) {
                    console.error('[ChorusActionsAPI] Failed to write optimistic operation:', operation, error);
                }
            }
        });
    }
    writeOptimisticOperation(db, operation) {
        return __awaiter(this, void 0, void 0, function* () {
            const { table, operation: operationType, data } = operation;
            const deltaTableName = `${table}_deltas`;
            const shadowTableName = `${table}_shadow`;
            // Write to delta table for tracking
            const deltaEntry = {
                operation: operationType,
                data: data,
                sync_status: 'pending',
                timestamp: operation.timestamp || Date.now(),
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
     * Sync offline actions when coming back online
     */
    syncOfflineActions() {
        return __awaiter(this, void 0, void 0, function* () {
            const offlineActions = JSON.parse(localStorage.getItem('chorus_offline_actions') || '[]');
            if (offlineActions.length === 0)
                return;
            for (const action of offlineActions) {
                try {
                    yield this.executeAction(action.actionName, action.params, { offline: false });
                }
                catch (error) {
                    console.error('Failed to sync offline action:', action, error);
                }
            }
            // Clear offline actions after successful sync
            localStorage.removeItem('chorus_offline_actions');
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
}
