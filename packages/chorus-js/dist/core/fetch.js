var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
// Offline-aware fetch wrapper for Chorus
import { offlineManager } from './offline';
/**
 * Offline-aware fetch wrapper that caches requests when offline
 */
export function offlineFetch(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, options = {}) {
        const { skipOfflineCache = false } = options, fetchOptions = __rest(options, ["skipOfflineCache"]);
        // If online, make the request normally
        if (offlineManager.getIsOnline()) {
            try {
                return yield fetch(url, fetchOptions);
            }
            catch (err) {
                // If fetch fails but we think we're online, we might have lost connection
                console.warn('Fetch failed despite being online, caching request:', err);
                // Cache the request if it's a mutation (POST, PUT, DELETE, PATCH)
                if (!skipOfflineCache && isMutationRequest(fetchOptions.method)) {
                    const requestId = offlineManager.cacheRequest(url, fetchOptions.method || 'GET', fetchOptions.body, fetchOptions.headers);
                    // Return a mock response indicating the request was cached
                    return createCachedResponse(requestId);
                }
                throw err;
            }
        }
        // If offline and it's a read operation, throw an error
        if (!isMutationRequest(fetchOptions.method)) {
            throw new Error('Cannot perform read operations while offline');
        }
        // If offline and it's a mutation, cache the request
        if (!skipOfflineCache) {
            const requestId = offlineManager.cacheRequest(url, fetchOptions.method || 'POST', fetchOptions.body, fetchOptions.headers);
            return createCachedResponse(requestId);
        }
        throw new Error('Network request failed - device is offline');
    });
}
/**
 * Check if the request is a mutation (creates/updates/deletes data)
 */
function isMutationRequest(method) {
    if (!method)
        return false;
    const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    return mutationMethods.includes(method.toUpperCase());
}
/**
 * Create a mock response for cached requests
 */
function createCachedResponse(requestId) {
    const responseBody = JSON.stringify({
        success: true,
        message: 'Request cached for offline processing',
        requestId,
        cached: true,
    });
    return new Response(responseBody, {
        status: 202, // Accepted
        statusText: 'Accepted - Cached for offline processing',
        headers: {
            'Content-Type': 'application/json',
            'X-Chorus-Cached': 'true',
            'X-Chorus-Request-Id': requestId,
        },
    });
}
