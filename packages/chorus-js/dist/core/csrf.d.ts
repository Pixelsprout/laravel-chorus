export interface CSRFTokenManager {
    getToken(): string | null;
    refreshToken(): Promise<string>;
}
/**
 * Laravel CSRF token manager
 */
export declare class LaravelCSRFManager implements CSRFTokenManager {
    private tokenMetaName;
    private refreshEndpoint;
    constructor(tokenMetaName?: string, refreshEndpoint?: string);
    /**
     * Get current CSRF token from meta tag
     */
    getToken(): string | null;
    /**
     * Refresh CSRF token from server
     */
    refreshToken(): Promise<string>;
    /**
     * Update CSRF meta tag
     */
    private updateMetaTag;
    /**
     * Update Inertia's CSRF token if available
     */
    private updateInertiaToken;
}
export declare const csrfManager: LaravelCSRFManager;
