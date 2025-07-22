// CSRF token management for Laravel
export interface CSRFTokenManager {
  getToken(): string | null;
  refreshToken(): Promise<string>;
}

/**
 * Laravel CSRF token manager
 */
export class LaravelCSRFManager implements CSRFTokenManager {
  private tokenMetaName: string;
  private refreshEndpoint: string;

  constructor(
    tokenMetaName: string = 'csrf-token',
    refreshEndpoint: string = '/csrf-token'
  ) {
    this.tokenMetaName = tokenMetaName;
    this.refreshEndpoint = refreshEndpoint;
  }

  /**
   * Get current CSRF token from meta tag
   */
  getToken(): string | null {
    const metaTag = document.querySelector(`meta[name="${this.tokenMetaName}"]`);
    return metaTag ? metaTag.getAttribute('content') : null;
  }

  /**
   * Refresh CSRF token from server
   */
  async refreshToken(): Promise<string> {
    try {
      const response = await fetch(this.refreshEndpoint, {
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

      const data = await response.json();
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
    } catch (error) {
      console.error('[Chorus] Failed to refresh CSRF token:', error);
      throw error;
    }
  }



  /**
   * Update CSRF meta tag
   */
  private updateMetaTag(token: string): void {
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
  private updateInertiaToken(token: string): void {
    // Update Inertia's internal CSRF token if it exists
    if (typeof window !== 'undefined' && (window as any).axios) {
      (window as any).axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
    }

    // Update any forms with CSRF tokens
    const csrfInputs = document.querySelectorAll('input[name="_token"]');
    csrfInputs.forEach((input: Element) => {
      (input as HTMLInputElement).value = token;
    });
  }
}

// Default instance
export const csrfManager = new LaravelCSRFManager();