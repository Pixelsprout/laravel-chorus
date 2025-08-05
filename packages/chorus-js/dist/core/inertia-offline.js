var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
// Offline-aware wrapper for Inertia.js requests
import { offlineManager } from './offline';
/**
 * Offline-aware wrapper for Inertia router methods
 */
export class InertiaOfflineWrapper {
    constructor(router) {
        this.originalRouter = router;
    }
    /**
     * Offline-aware POST request
     */
    post(url, data = {}, options = {}) {
        const { skipOfflineCache = false, onOfflineCached, optimisticData } = options, inertiaOptions = __rest(options, ["skipOfflineCache", "onOfflineCached", "optimisticData"]);
        if (offlineManager.getIsOnline()) {
            return this.originalRouter.post(url, data, inertiaOptions);
        }
        if (!skipOfflineCache) {
            const headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };
            const requestId = offlineManager.cacheRequest(url, 'POST', JSON.stringify(data), headers, optimisticData);
            if (onOfflineCached) {
                onOfflineCached(requestId);
            }
            // Return a promise that resolves immediately for offline requests
            return Promise.resolve({
                cached: true,
                requestId,
                message: 'Request cached for offline processing'
            });
        }
        throw new Error('Cannot make POST request while offline');
    }
    /**
     * Offline-aware PUT request
     */
    put(url, data = {}, options = {}) {
        const { skipOfflineCache = false, onOfflineCached } = options, inertiaOptions = __rest(options, ["skipOfflineCache", "onOfflineCached"]);
        if (offlineManager.getIsOnline()) {
            return this.originalRouter.put(url, data, inertiaOptions);
        }
        if (!skipOfflineCache) {
            const headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };
            const requestId = offlineManager.cacheRequest(url, 'PUT', JSON.stringify(data), headers);
            if (onOfflineCached) {
                onOfflineCached(requestId);
            }
            return Promise.resolve({
                cached: true,
                requestId,
                message: 'Request cached for offline processing'
            });
        }
        throw new Error('Cannot make PUT request while offline');
    }
    /**
     * Offline-aware DELETE request
     */
    delete(url, options = {}) {
        const { skipOfflineCache = false, onOfflineCached } = options, inertiaOptions = __rest(options, ["skipOfflineCache", "onOfflineCached"]);
        if (offlineManager.getIsOnline()) {
            return this.originalRouter.delete(url, inertiaOptions);
        }
        if (!skipOfflineCache) {
            const headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };
            const requestId = offlineManager.cacheRequest(url, 'DELETE', undefined, headers);
            if (onOfflineCached) {
                onOfflineCached(requestId);
            }
            return Promise.resolve({
                cached: true,
                requestId,
                message: 'Request cached for offline processing'
            });
        }
        throw new Error('Cannot make DELETE request while offline');
    }
    /**
     * Offline-aware PATCH request
     */
    patch(url, data = {}, options = {}) {
        const { skipOfflineCache = false, onOfflineCached } = options, inertiaOptions = __rest(options, ["skipOfflineCache", "onOfflineCached"]);
        if (offlineManager.getIsOnline()) {
            return this.originalRouter.patch(url, data, inertiaOptions);
        }
        if (!skipOfflineCache) {
            const headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };
            const requestId = offlineManager.cacheRequest(url, 'PATCH', JSON.stringify(data), headers);
            if (onOfflineCached) {
                onOfflineCached(requestId);
            }
            return Promise.resolve({
                cached: true,
                requestId,
                message: 'Request cached for offline processing'
            });
        }
        throw new Error('Cannot make PATCH request while offline');
    }
    /**
     * Pass through GET requests (read-only operations)
     * GET requests are not cached as they don't modify data
     */
    get(url, data = {}, options = {}) {
        if (!offlineManager.getIsOnline()) {
            throw new Error('Cannot make GET request while offline');
        }
        return this.originalRouter.get(url, data, options);
    }
    /**
     * Pass through visit method
     */
    visit(url, options = {}) {
        if (!offlineManager.getIsOnline()) {
            throw new Error('Cannot navigate while offline');
        }
        return this.originalRouter.visit(url, options);
    }
    /**
     * Pass through other router methods
     */
    reload(options = {}) {
        return this.originalRouter.reload(options);
    }
    replace(url, options = {}) {
        return this.originalRouter.replace(url, options);
    }
    remember(data, key) {
        return this.originalRouter.remember(data, key);
    }
    restore(key) {
        return this.originalRouter.restore(key);
    }
    on(type, callback) {
        return this.originalRouter.on(type, callback);
    }
    cancel() {
        return this.originalRouter.cancel();
    }
}
/**
 * Create an offline-aware wrapper for Inertia router
 */
export function createOfflineRouter(router) {
    return new InertiaOfflineWrapper(router);
}
