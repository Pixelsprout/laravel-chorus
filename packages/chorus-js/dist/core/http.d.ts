import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
export interface HttpClientConfig {
    baseURL?: string;
    timeout?: number;
    withCredentials?: boolean;
}
/**
 * HTTP client that automatically handles CSRF tokens through axios defaults
 * This follows Inertia.js best practices for CSRF protection
 */
export declare class HttpClient {
    private axiosInstance;
    constructor(config?: HttpClientConfig);
    /**
     * Setup automatic CSRF token handling
     * Axios will automatically read the CSRF token from the meta tag and include it in requests
     */
    private setupCSRFHandling;
    /**
     * Get CSRF token from meta tag
     */
    private getCSRFTokenFromMeta;
    /**
     * GET request
     */
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * POST request
     */
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * PUT request
     */
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * PATCH request
     */
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * DELETE request
     */
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * Get the underlying axios instance for advanced usage
     */
    getAxiosInstance(): AxiosInstance;
    /**
     * Update base URL
     */
    setBaseURL(baseURL: string): void;
    /**
     * Set timeout
     */
    setTimeout(timeout: number): void;
}
export declare const httpClient: HttpClient;
