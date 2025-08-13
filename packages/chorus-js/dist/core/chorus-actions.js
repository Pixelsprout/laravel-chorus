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
    constructor(baseURL = '/api', axiosConfig) {
        this.cache = new Map();
        this.baseURL = baseURL;
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
        // Emit optimistic update events for each operation
        operations.forEach(operation => {
            window.dispatchEvent(new CustomEvent('chorus:optimistic-operation', {
                detail: operation
            }));
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
