// Offline-aware fetch wrapper for Chorus
import { offlineManager } from './offline';

export interface OfflineFetchOptions extends RequestInit {
  skipOfflineCache?: boolean;
}

/**
 * Offline-aware fetch wrapper that caches requests when offline
 */
export async function offlineFetch(
  url: string,
  options: OfflineFetchOptions = {}
): Promise<Response> {
  const { skipOfflineCache = false, ...fetchOptions } = options;

  // If online, make the request normally
  if (offlineManager.getIsOnline()) {
    try {
      return await fetch(url, fetchOptions);
    } catch (err) {
      // If fetch fails but we think we're online, we might have lost connection
      console.warn('Fetch failed despite being online, caching request:', err);
      
      // Cache the request if it's a mutation (POST, PUT, DELETE, PATCH)
      if (!skipOfflineCache && isMutationRequest(fetchOptions.method)) {
        const requestId = offlineManager.cacheRequest(
          url,
          fetchOptions.method || 'GET',
          fetchOptions.body as string,
          fetchOptions.headers as Record<string, string>
        );
        
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
    const requestId = offlineManager.cacheRequest(
      url,
      fetchOptions.method || 'POST',
      fetchOptions.body as string,
      fetchOptions.headers as Record<string, string>
    );
    
    return createCachedResponse(requestId);
  }

  throw new Error('Network request failed - device is offline');
}

/**
 * Check if the request is a mutation (creates/updates/deletes data)
 */
function isMutationRequest(method?: string): boolean {
  if (!method) return false;
  const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  return mutationMethods.includes(method.toUpperCase());
}

/**
 * Create a mock response for cached requests
 */
function createCachedResponse(requestId: string): Response {
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