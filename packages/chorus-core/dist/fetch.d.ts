export interface OfflineFetchOptions extends RequestInit {
    skipOfflineCache?: boolean;
}
/**
 * Offline-aware fetch wrapper that caches requests when offline
 */
export declare function offlineFetch(url: string, options?: OfflineFetchOptions): Promise<Response>;
