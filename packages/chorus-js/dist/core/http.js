var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// HTTP client with automatic CSRF handling using axios
import axios from 'axios';
/**
 * HTTP client that automatically handles CSRF tokens through axios defaults
 * This follows Inertia.js best practices for CSRF protection
 */
export class HttpClient {
    constructor(config = {}) {
        // Create axios instance with sensible defaults
        this.axiosInstance = axios.create({
            baseURL: config.baseURL || '/api',
            timeout: config.timeout || 10000,
            withCredentials: config.withCredentials !== false, // true by default
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        // Setup automatic CSRF token handling
        this.setupCSRFHandling();
    }
    /**
     * Setup automatic CSRF token handling
     * Axios will automatically read the CSRF token from the meta tag and include it in requests
     */
    setupCSRFHandling() {
        // Set up request interceptor to automatically include CSRF token
        this.axiosInstance.interceptors.request.use((config) => {
            // Get CSRF token from meta tag (Laravel standard)
            const token = this.getCSRFTokenFromMeta();
            if (token && config.headers) {
                config.headers['X-CSRF-TOKEN'] = token;
            }
            return config;
        });
        // Set up response interceptor to handle CSRF token expiration
        this.axiosInstance.interceptors.response.use((response) => response, (error) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const originalRequest = error.config;
            // Handle CSRF token expiration (419 status)
            if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 419 && !originalRequest._retry) {
                originalRequest._retry = true;
                try {
                    // Try to refresh the page to get a new CSRF token
                    // In a SPA context, you might want to refresh the token via an endpoint
                    console.warn('[Chorus HTTP] CSRF token expired, page refresh may be required');
                    // For now, just retry the request once with the current token
                    // The application should handle token refresh at a higher level
                    return this.axiosInstance(originalRequest);
                }
                catch (refreshError) {
                    console.error('[Chorus HTTP] Failed to handle CSRF token expiration:', refreshError);
                    return Promise.reject(error);
                }
            }
            return Promise.reject(error);
        }));
    }
    /**
     * Get CSRF token from meta tag
     */
    getCSRFTokenFromMeta() {
        if (typeof document === 'undefined')
            return null;
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag ? metaTag.getAttribute('content') : null;
    }
    /**
     * GET request
     */
    get(url, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.axiosInstance.get(url, config);
        });
    }
    /**
     * POST request
     */
    post(url, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.axiosInstance.post(url, data, config);
        });
    }
    /**
     * PUT request
     */
    put(url, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.axiosInstance.put(url, data, config);
        });
    }
    /**
     * PATCH request
     */
    patch(url, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.axiosInstance.patch(url, data, config);
        });
    }
    /**
     * DELETE request
     */
    delete(url, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.axiosInstance.delete(url, config);
        });
    }
    /**
     * Get the underlying axios instance for advanced usage
     */
    getAxiosInstance() {
        return this.axiosInstance;
    }
    /**
     * Update base URL
     */
    setBaseURL(baseURL) {
        this.axiosInstance.defaults.baseURL = baseURL;
    }
    /**
     * Set timeout
     */
    setTimeout(timeout) {
        this.axiosInstance.defaults.timeout = timeout;
    }
}
// Export singleton instance
export const httpClient = new HttpClient();
