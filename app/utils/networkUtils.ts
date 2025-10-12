/**
 * Network utility functions for handling connectivity and offline scenarios
 */

import React from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  lastChecked: Date;
  retryCount: number;
}

class NetworkManager {
  private status: NetworkStatus = {
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    lastChecked: new Date(),
    retryCount: 0,
  };

  private listeners: Array<(status: NetworkStatus) => void> = [];

  constructor() {
    // Only add event listeners if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Listen for online/offline events
      window.addEventListener('online', () => {
        this.updateStatus(true);
      });

      window.addEventListener('offline', () => {
        this.updateStatus(false);
      });
    }
  }

  private updateStatus(isOnline: boolean) {
    this.status = {
      isOnline,
      lastChecked: new Date(),
      retryCount: isOnline ? 0 : this.status.retryCount + 1,
    };

    // Notify listeners
    this.listeners.forEach(listener => listener(this.status));
  }

  public getStatus(): NetworkStatus {
    return { ...this.status };
  }

  public isOnline(): boolean {
    // If we're in a server environment, assume we're online
    if (typeof window === 'undefined') {
      return true;
    }
    return this.status.isOnline;
  }

  public addListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Check if an error is a network connectivity issue
   */
  public isNetworkError(error: any): boolean {
    if (!error) return false;

    // Check for common network error patterns
    const networkErrorPatterns = [
      'ERR_INTERNET_DISCONNECTED',
      'Network Error',
      'ERR_NETWORK',
      'ERR_CONNECTION_REFUSED',
      'ERR_CONNECTION_TIMED_OUT',
      'ERR_NAME_NOT_RESOLVED',
    ];

    const errorMessage = error.message || error.toString();
    const errorCode = error.code;

    return (
      errorCode === 'NETWORK_ERROR' ||
      errorCode === 'ECONNABORTED' ||
      errorCode === 'ENOTFOUND' ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ETIMEDOUT' ||
      networkErrorPatterns.some(pattern =>
        errorMessage.includes(pattern)
      )
    );
  }

  /**
   * Handle network errors gracefully with retry logic
   */
  public async handleNetworkRequest<T>(
    requestFn: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      onRetry?: (attempt: number) => void;
      onOffline?: () => void;
    } = {}
  ): Promise<T | null> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      onRetry,
      onOffline,
    } = options;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check if we're offline before making the request
        if (!this.isOnline()) {
          console.warn('Network is offline, skipping request');
          onOffline?.();
          return null;
        }

        const result = await requestFn();
        this.updateStatus(true); // Success means we're online
        return result;
      } catch (error: any) {
        if (this.isNetworkError(error)) {
          this.updateStatus(false);

          if (attempt === maxRetries) {
            console.warn('Max retries reached for network request');
            onOffline?.();
            return null;
          }

          console.warn(`Network request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
          onRetry?.(attempt + 1);

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        } else {
          // Non-network error, don't retry
          throw error;
        }
      }
    }

    return null;
  }
}

// Export singleton instance with lazy initialization
let networkManagerInstance: NetworkManager | null = null;

export const getNetworkManager = (): NetworkManager => {
  if (!networkManagerInstance) {
    networkManagerInstance = new NetworkManager();
  }
  return networkManagerInstance;
};

/**
 * Hook for React components to monitor network status
 */
export function useNetworkStatus() {
  const [status, setStatus] = React.useState<NetworkStatus>(() => {
    // Only initialize with network status if we're in the browser
    if (typeof window !== 'undefined') {
      return getNetworkManager().getStatus();
    }
    return { isOnline: true, lastChecked: new Date(), retryCount: 0 };
  });

  React.useEffect(() => {
    // Only add listeners if we're in the browser
    if (typeof window !== 'undefined') {
      const unsubscribe = getNetworkManager().addListener(setStatus);
      return unsubscribe;
    }
  }, []);

  return status;
}

/**
 * Utility function to make network requests with automatic retry and offline handling
 */
export async function makeNetworkRequest<T>(
  requestFn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
    onRetry?: (attempt: number) => void;
    onOffline?: () => void;
  }
): Promise<T | null> {
  return getNetworkManager().handleNetworkRequest(requestFn, options);
}
