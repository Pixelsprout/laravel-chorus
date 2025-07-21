var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Laravel CSRF token manager
 */
export class LaravelCSRFManager {
    constructor(tokenMetaName = 'csrf-token', refreshEndpoint = '/csrf-token') {
        this.tokenMetaName = tokenMetaName;
        this.refreshEndpoint = refreshEndpoint;
    }
    /**
     * Get current CSRF token from meta tag
     */
    getToken() {
        const metaTag = document.querySelector(`meta[name="${this.tokenMetaName}"]`);
        return metaTag ? metaTag.getAttribute('content') : null;
    }
    /**
     * Refresh CSRF token from server
     */
    refreshToken() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(this.refreshEndpoint, {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to refresh CSRF token: ${response.status}`);
                }
                const data = yield response.json();
                const newToken = data.csrf_token || data.token;
                if (!newToken) {
                    throw new Error('No CSRF token in response');
                }
                // Update the meta tag
                this.updateMetaTag(newToken);
                // Update Inertia's CSRF token if available
                this.updateInertiaToken(newToken);
                console.log('[Chorus] CSRF token refreshed');
                return newToken;
            }
            catch (error) {
                console.error('[Chorus] Failed to refresh CSRF token:', error);
                throw error;
            }
        });
    }
    /**
     * Update CSRF meta tag
     */
    updateMetaTag(token) {
        let metaTag = document.querySelector(`meta[name="${this.tokenMetaName}"]`);
        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.setAttribute('name', this.tokenMetaName);
            document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', token);
    }
    /**
     * Update Inertia's CSRF token if available
     */
    updateInertiaToken(token) {
        // Update Inertia's internal CSRF token if it exists
        if (typeof window !== 'undefined' && window.axios) {
            window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
        }
        // Update any forms with CSRF tokens
        const csrfInputs = document.querySelectorAll('input[name="_token"]');
        csrfInputs.forEach((input) => {
            input.value = token;
        });
    }
}
// Default instance
export const csrfManager = new LaravelCSRFManager();
