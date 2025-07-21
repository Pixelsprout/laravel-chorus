// Offline-aware wrapper for Inertia.js requests
import { offlineManager } from './offline';
import { csrfManager } from './csrf';

export interface InertiaOfflineOptions {
  skipOfflineCache?: boolean;
  onOfflineCached?: (requestId: string) => void;
  optimisticData?: any;
}

/**
 * Offline-aware wrapper for Inertia router methods
 */
export class InertiaOfflineWrapper {
  private originalRouter: any;

  constructor(router: any) {
    this.originalRouter = router;
  }

  /**
   * Offline-aware POST request
   */
  post(
    url: string,
    data: any = {},
    options: any & InertiaOfflineOptions = {}
  ) {
    const { skipOfflineCache = false, onOfflineCached, optimisticData, ...inertiaOptions } = options;

    if (offlineManager.getIsOnline()) {
      return this.originalRouter.post(url, data, inertiaOptions);
    }

    if (!skipOfflineCache) {
      const csrfToken = csrfManager.getToken();
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
      }

      const requestId = offlineManager.cacheRequest(
        url,
        'POST',
        JSON.stringify(data),
        headers,
        optimisticData
      );

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
  put(
    url: string,
    data: any = {},
    options: any & InertiaOfflineOptions = {}
  ) {
    const { skipOfflineCache = false, onOfflineCached, ...inertiaOptions } = options;

    if (offlineManager.getIsOnline()) {
      return this.originalRouter.put(url, data, inertiaOptions);
    }

    if (!skipOfflineCache) {
      const csrfToken = csrfManager.getToken();
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
      }

      const requestId = offlineManager.cacheRequest(
        url,
        'PUT',
        JSON.stringify(data),
        headers
      );

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
  delete(
    url: string,
    options: any & InertiaOfflineOptions = {}
  ) {
    const { skipOfflineCache = false, onOfflineCached, ...inertiaOptions } = options;

    if (offlineManager.getIsOnline()) {
      return this.originalRouter.delete(url, inertiaOptions);
    }

    if (!skipOfflineCache) {
      const csrfToken = csrfManager.getToken();
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
      }

      const requestId = offlineManager.cacheRequest(
        url,
        'DELETE',
        undefined,
        headers
      );

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
  patch(
    url: string,
    data: any = {},
    options: any & InertiaOfflineOptions = {}
  ) {
    const { skipOfflineCache = false, onOfflineCached, ...inertiaOptions } = options;

    if (offlineManager.getIsOnline()) {
      return this.originalRouter.patch(url, data, inertiaOptions);
    }

    if (!skipOfflineCache) {
      const csrfToken = csrfManager.getToken();
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
      }

      const requestId = offlineManager.cacheRequest(
        url,
        'PATCH',
        JSON.stringify(data),
        headers
      );

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
  get(url: string, data: any = {}, options: any = {}) {
    if (!offlineManager.getIsOnline()) {
      throw new Error('Cannot make GET request while offline');
    }
    return this.originalRouter.get(url, data, options);
  }

  /**
   * Pass through visit method
   */
  visit(url: string, options: any = {}) {
    if (!offlineManager.getIsOnline()) {
      throw new Error('Cannot navigate while offline');
    }
    return this.originalRouter.visit(url, options);
  }

  /**
   * Pass through other router methods
   */
  reload(options: any = {}) {
    return this.originalRouter.reload(options);
  }

  replace(url: string, options: any = {}) {
    return this.originalRouter.replace(url, options);
  }

  remember(data: any, key?: string) {
    return this.originalRouter.remember(data, key);
  }

  restore(key?: string) {
    return this.originalRouter.restore(key);
  }

  on(type: string, callback: Function) {
    return this.originalRouter.on(type, callback);
  }

  cancel() {
    return this.originalRouter.cancel();
  }
}

/**
 * Create an offline-aware wrapper for Inertia router
 */
export function createOfflineRouter(router: any): InertiaOfflineWrapper {
  return new InertiaOfflineWrapper(router);
}