export interface InertiaOfflineOptions {
    skipOfflineCache?: boolean;
    onOfflineCached?: (requestId: string) => void;
    optimisticData?: any;
}
/**
 * Offline-aware wrapper for Inertia router methods
 */
export declare class InertiaOfflineWrapper {
    private originalRouter;
    constructor(router: any);
    /**
     * Offline-aware POST request
     */
    post(url: string, data?: any, options?: any & InertiaOfflineOptions): any;
    /**
     * Offline-aware PUT request
     */
    put(url: string, data?: any, options?: any & InertiaOfflineOptions): any;
    /**
     * Offline-aware DELETE request
     */
    delete(url: string, options?: any & InertiaOfflineOptions): any;
    /**
     * Offline-aware PATCH request
     */
    patch(url: string, data?: any, options?: any & InertiaOfflineOptions): any;
    /**
     * Pass through GET requests (read-only operations)
     * GET requests are not cached as they don't modify data
     */
    get(url: string, data?: any, options?: any): any;
    /**
     * Pass through visit method
     */
    visit(url: string, options?: any): any;
    /**
     * Pass through other router methods
     */
    reload(options?: any): any;
    replace(url: string, options?: any): any;
    remember(data: any, key?: string): any;
    restore(key?: string): any;
    on(type: string, callback: Function): any;
    cancel(): any;
}
/**
 * Create an offline-aware wrapper for Inertia router
 */
export declare function createOfflineRouter(router: any): InertiaOfflineWrapper;
