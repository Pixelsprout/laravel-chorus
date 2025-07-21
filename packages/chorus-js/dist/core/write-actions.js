var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Write Actions API for Chorus
import { csrfManager } from './csrf';
import { offlineManager } from './offline';
export class WriteActionsAPI {
    constructor(baseUrl = '/api') {
        this.actions = new Map();
        this.loadingPromises = new Map();
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    }
    /**
     * Load available actions for a table
     */
    loadActions(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if actions are already cached
            const cachedActions = this.actions.get(tableName);
            if (cachedActions) {
                console.log(`[WriteActions] Using cached actions for '${tableName}'`);
                return cachedActions;
            }
            // Check if we're already loading actions for this table
            const existingPromise = this.loadingPromises.get(tableName);
            if (existingPromise) {
                console.log(`[WriteActions] Waiting for existing loadActions request for '${tableName}'`);
                return existingPromise;
            }
            // Check if we're offline
            if (!offlineManager.getIsOnline()) {
                // Cache the loadActions request for when we come back online
                const url = `${this.baseUrl}/actions/${tableName}`;
                offlineManager.cacheRequest(url, 'GET', undefined, {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfManager.getToken() || '',
                });
                // Return empty actions object for offline mode
                // This allows the write actions to still be attempted if they support offline writes
                console.warn(`[WriteActions] Offline mode: loadActions request for '${tableName}' cached for later execution`);
                return {};
            }
            // Create and cache the loading promise
            const loadingPromise = this.performLoadActions(tableName);
            this.loadingPromises.set(tableName, loadingPromise);
            try {
                const result = yield loadingPromise;
                return result;
            }
            finally {
                // Clean up the loading promise
                this.loadingPromises.delete(tableName);
            }
        });
    }
    /**
     * Perform the actual loadActions request
     */
    performLoadActions(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[WriteActions] Loading actions for '${tableName}'`);
            try {
                const response = yield fetch(`${this.baseUrl}/actions/${tableName}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfManager.getToken() || '',
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to load actions: ${response.statusText}`);
                }
                const result = yield response.json();
                if (result.success) {
                    this.actions.set(tableName, result.actions);
                    console.log(`[WriteActions] Successfully loaded ${Object.keys(result.actions).length} actions for '${tableName}'`);
                    return result.actions;
                }
                else {
                    throw new Error(result.error || 'Failed to load actions');
                }
            }
            catch (error) {
                console.error(`Error loading actions for ${tableName}:`, error);
                throw error;
            }
        });
    }
    /**
     * Get cached actions for a table
     */
    getActions(tableName) {
        return this.actions.get(tableName) || null;
    }
    /**
     * Check if actions are loaded for a table
     */
    hasActions(tableName) {
        return this.actions.has(tableName);
    }
    /**
     * Clear cached actions for a table (or all tables if no tableName provided)
     */
    clearActionsCache(tableName) {
        if (tableName) {
            this.actions.delete(tableName);
            this.loadingPromises.delete(tableName);
            console.log(`[WriteActions] Cleared actions cache for '${tableName}'`);
        }
        else {
            this.actions.clear();
            this.loadingPromises.clear();
            console.log(`[WriteActions] Cleared all actions cache`);
        }
    }
    /**
     * Execute a write action
     */
    execute(tableName, actionName, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if we're offline first
            if (!offlineManager.getIsOnline()) {
                // In offline mode, we assume the action supports offline writes
                // The actual validation will happen when we sync back online
                console.log(`[WriteActions] Offline mode: executing '${actionName}' optimistically`);
                return this.handleOfflineWrite(tableName, actionName, data);
            }
            // Ensure actions are loaded when online
            let actions = this.getActions(tableName);
            if (!actions) {
                actions = yield this.loadActions(tableName);
            }
            const actionConfig = actions[actionName];
            if (!actionConfig) {
                throw new Error(`Action '${actionName}' not found for table '${tableName}'`);
            }
            return this.executeOnline(tableName, actionName, data);
        });
    }
    /**
     * Execute a batch write action
     */
    executeBatch(tableName, actionName, items) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if we're offline first
            if (!offlineManager.getIsOnline()) {
                // In offline mode, we assume the action supports offline writes and batching
                // The actual validation will happen when we sync back online
                console.log(`[WriteActions] Offline mode: executing batch '${actionName}' optimistically`);
                return this.handleOfflineBatchWrite(tableName, actionName, items);
            }
            // Ensure actions are loaded when online
            let actions = this.getActions(tableName);
            if (!actions) {
                actions = yield this.loadActions(tableName);
            }
            const actionConfig = actions[actionName];
            if (!actionConfig) {
                throw new Error(`Action '${actionName}' not found for table '${tableName}'`);
            }
            if (!actionConfig.supportsBatch) {
                throw new Error(`Action '${actionName}' does not support batch operations`);
            }
            return this.executeBatchOnline(tableName, actionName, items);
        });
    }
    /**
     * Execute action online
     */
    executeOnline(tableName, actionName, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const csrfToken = csrfManager.getToken();
                if (!csrfToken) {
                    console.warn('[WriteActions] No CSRF token available, attempting to refresh...');
                    yield csrfManager.refreshToken();
                }
                const response = yield fetch(`${this.baseUrl}/write/${tableName}/${actionName}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfManager.getToken() || '',
                    },
                    body: JSON.stringify(data),
                });
                const result = yield response.json();
                // Handle CSRF token expiration
                if (response.status === 419) {
                    console.log('[WriteActions] CSRF token expired, refreshing and retrying...');
                    yield csrfManager.refreshToken();
                    return this.executeOnline(tableName, actionName, data);
                }
                return result;
            }
            catch (error) {
                console.error(`Error executing action ${actionName}:`, error);
                throw error;
            }
        });
    }
    /**
     * Execute batch action online
     */
    executeBatchOnline(tableName, actionName, items) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const csrfToken = csrfManager.getToken();
                if (!csrfToken) {
                    console.warn('[WriteActions] No CSRF token available for batch, attempting to refresh...');
                    yield csrfManager.refreshToken();
                }
                const response = yield fetch(`${this.baseUrl}/write/${tableName}/${actionName}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfManager.getToken() || '',
                    },
                    body: JSON.stringify({ items }),
                });
                const result = yield response.json();
                // Handle CSRF token expiration
                if (response.status === 419) {
                    console.log('[WriteActions] CSRF token expired in batch, refreshing and retrying...');
                    yield csrfManager.refreshToken();
                    return this.executeBatchOnline(tableName, actionName, items);
                }
                return result;
            }
            catch (error) {
                console.error(`Error executing batch action ${actionName}:`, error);
                throw error;
            }
        });
    }
    /**
     * Handle offline write by caching the request
     */
    handleOfflineWrite(tableName, actionName, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${this.baseUrl}/write/${tableName}/${actionName}`;
            const requestId = offlineManager.cacheRequest(url, 'POST', JSON.stringify(data), {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfManager.getToken() || '',
            }, data // Store optimistic data
            );
            // Return optimistic response
            return {
                success: true,
                data: data,
                action: actionName,
                table: tableName,
                // Add metadata to indicate this is an offline/optimistic response
                _offline: true,
                _requestId: requestId,
            };
        });
    }
    /**
     * Handle offline batch write by caching the request
     */
    handleOfflineBatchWrite(tableName, actionName, items) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${this.baseUrl}/write/${tableName}/${actionName}`;
            const requestId = offlineManager.cacheRequest(url, 'POST', JSON.stringify({ items }), {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfManager.getToken() || '',
            }, items // Store optimistic data
            );
            // Return optimistic response
            return {
                success: true,
                data: {
                    results: items.map((item, index) => ({
                        success: true,
                        index,
                        data: item,
                    })),
                    summary: {
                        total: items.length,
                        successful: items.length,
                        failed: 0,
                    },
                },
                action: actionName,
                table: tableName,
                // Add metadata to indicate this is an offline/optimistic response
                _offline: true,
                _requestId: requestId,
            };
        });
    }
    /**
     * Validate data against action rules (client-side validation)
     */
    validateData(tableName, actionName, data) {
        const actions = this.getActions(tableName);
        if (!actions || !actions[actionName]) {
            return ['Action not found'];
        }
        const rules = actions[actionName].rules;
        const errors = [];
        // Basic client-side validation (can be extended)
        for (const [field, rule] of Object.entries(rules)) {
            if (rule.includes('required') && (!data[field] || data[field] === '')) {
                errors.push(`${field} is required`);
            }
        }
        return errors;
    }
}
/**
 * Table-specific write actions class with clean API
 */
export class TableWriteActions {
    constructor(api, tableName) {
        this.optimisticCallbacks = new Map();
        this.api = api;
        this.tableName = tableName;
    }
    create(optimisticDataOrServerData, serverDataOrCallback, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            let optimisticData;
            let serverData;
            let responseCallback;
            // Handle overloaded parameters
            if (typeof serverDataOrCallback === 'function') {
                // Two parameter version: create(serverData, callback)
                serverData = optimisticDataOrServerData;
                responseCallback = serverDataOrCallback;
            }
            else {
                // Three parameter version: create(optimisticData, serverData, callback)
                optimisticData = optimisticDataOrServerData;
                serverData = serverDataOrCallback;
                responseCallback = callback;
            }
            try {
                // Perform optimistic update if provided
                if (optimisticData) {
                    const optimisticCallback = this.getOptimisticCallback('create');
                    if (optimisticCallback) {
                        yield optimisticCallback(optimisticData);
                    }
                }
                // Execute server request
                const response = yield this.api.execute(this.tableName, 'create', serverData);
                if (responseCallback) {
                    responseCallback(response);
                }
                return response;
            }
            catch (error) {
                const errorResponse = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    action: 'create',
                    table: this.tableName,
                };
                if (responseCallback) {
                    responseCallback(errorResponse);
                }
                throw error;
            }
        });
    }
    update(optimisticDataOrServerData, serverDataOrCallback, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            let optimisticData;
            let serverData;
            let responseCallback;
            // Handle overloaded parameters
            if (typeof serverDataOrCallback === 'function') {
                // Two parameter version: update(serverData, callback)
                serverData = optimisticDataOrServerData;
                responseCallback = serverDataOrCallback;
            }
            else {
                // Three parameter version: update(optimisticData, serverData, callback)
                optimisticData = optimisticDataOrServerData;
                serverData = serverDataOrCallback;
                responseCallback = callback;
            }
            try {
                // Perform optimistic update if provided
                if (optimisticData) {
                    const optimisticCallback = this.getOptimisticCallback('update');
                    if (optimisticCallback) {
                        yield optimisticCallback(optimisticData);
                    }
                }
                // Execute server request
                const response = yield this.api.execute(this.tableName, 'update', serverData);
                if (responseCallback) {
                    responseCallback(response);
                }
                return response;
            }
            catch (error) {
                const errorResponse = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    action: 'update',
                    table: this.tableName,
                };
                if (responseCallback) {
                    responseCallback(errorResponse);
                }
                throw error;
            }
        });
    }
    delete(optimisticDataOrServerData, serverDataOrCallback, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            let optimisticData;
            let serverData;
            let responseCallback;
            // Handle overloaded parameters
            if (typeof serverDataOrCallback === 'function') {
                // Two parameter version: delete(serverData, callback)
                serverData = optimisticDataOrServerData;
                responseCallback = serverDataOrCallback;
            }
            else {
                // Three parameter version: delete(optimisticData, serverData, callback)
                optimisticData = optimisticDataOrServerData;
                serverData = serverDataOrCallback;
                responseCallback = callback;
            }
            try {
                // Perform optimistic update if provided
                if (optimisticData) {
                    const optimisticCallback = this.getOptimisticCallback('delete');
                    if (optimisticCallback) {
                        yield optimisticCallback(optimisticData);
                    }
                }
                // Execute server request
                const response = yield this.api.execute(this.tableName, 'delete', serverData);
                if (responseCallback) {
                    responseCallback(response);
                }
                return response;
            }
            catch (error) {
                const errorResponse = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    action: 'delete',
                    table: this.tableName,
                };
                if (responseCallback) {
                    responseCallback(errorResponse);
                }
                throw error;
            }
        });
    }
    /**
     * Set the optimistic update callback for a specific action
     * @param action - The action name ('create', 'update', 'delete')
     * @param callback - Function to call for optimistic updates
     */
    setOptimisticCallback(action, callback) {
        this.optimisticCallbacks.set(action, callback);
    }
    /**
     * Get the optimistic callback for an action
     * @param action - The action name
     */
    getOptimisticCallback(action) {
        return this.optimisticCallbacks.get(action);
    }
    /**
     * Execute a custom action
     * @param actionName - The name of the action
     * @param data - The data to send
     * @param callback - Optional callback function
     */
    action(actionName, data, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.api.execute(this.tableName, actionName, data);
                if (callback) {
                    callback(response);
                }
                return response;
            }
            catch (error) {
                const errorResponse = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    action: actionName,
                    table: this.tableName,
                };
                if (callback) {
                    callback(errorResponse);
                }
                throw error;
            }
        });
    }
    /**
     * Create multiple records in a batch
     * @param items - Array of data objects to create
     * @param callback - Optional callback function
     */
    createBatch(items, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.api.executeBatch(this.tableName, 'create', items);
                if (callback) {
                    callback(response);
                }
                return response;
            }
            catch (error) {
                const errorResponse = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    action: 'create',
                    table: this.tableName,
                };
                if (callback) {
                    callback(errorResponse);
                }
                throw error;
            }
        });
    }
    /**
     * Update multiple records in a batch
     * @param items - Array of data objects to update
     * @param callback - Optional callback function
     */
    updateBatch(items, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.api.executeBatch(this.tableName, 'update', items);
                if (callback) {
                    callback(response);
                }
                return response;
            }
            catch (error) {
                const errorResponse = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    action: 'update',
                    table: this.tableName,
                };
                if (callback) {
                    callback(errorResponse);
                }
                throw error;
            }
        });
    }
    /**
     * Delete multiple records in a batch
     * @param items - Array of data objects to delete
     * @param callback - Optional callback function
     */
    deleteBatch(items, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.api.executeBatch(this.tableName, 'delete', items);
                if (callback) {
                    callback(response);
                }
                return response;
            }
            catch (error) {
                const errorResponse = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    action: 'delete',
                    table: this.tableName,
                };
                if (callback) {
                    callback(errorResponse);
                }
                throw error;
            }
        });
    }
    /**
     * Get the underlying API instance (for advanced usage)
     */
    getAPI() {
        return this.api;
    }
    /**
     * Get the table name
     */
    getTableName() {
        return this.tableName;
    }
}
/**
 * Enhanced WriteActionsAPI with table factory method
 */
export class EnhancedWriteActionsAPI extends WriteActionsAPI {
    constructor() {
        super(...arguments);
        this.tableInstances = new Map();
    }
    /**
     * Get a table-specific write actions instance
     * @param tableName - The name of the table
     */
    table(tableName) {
        if (!this.tableInstances.has(tableName)) {
            this.tableInstances.set(tableName, new TableWriteActions(this, tableName));
        }
        return this.tableInstances.get(tableName);
    }
    /**
     * Clear table instances cache
     */
    clearTableInstances() {
        this.tableInstances.clear();
    }
}
// Export singleton instance with enhanced API
export const writeActions = new EnhancedWriteActionsAPI();
// Export the original API for backward compatibility
export const writeActionsAPI = new WriteActionsAPI();
