import { useState, useCallback, useEffect } from 'react';
import { getApiUrl, getWebSocketUrl, resetApiPortCache } from '../utils/apiConfig';

// Custom hook for API calls with dynamic port discovery
export function useApi() {
  const [apiReady, setApiReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize API connection
    const initApi = async () => {
      try {
        await getApiUrl('/api/status'); // This will cache the port
        setApiReady(true);
      } catch (error) {
        console.error('Failed to initialize API connection:', error);
        setApiReady(false);
      } finally {
        setLoading(false);
      }
    };

    initApi();
  }, []);

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const url = await getApiUrl(path);
    
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok && response.status === 0) {
        // Connection failed, reset cache and retry
        resetApiPortCache();
        const retryUrl = await getApiUrl(path);
        return fetch(retryUrl, {
          ...options,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
        });
      }

      return response;
    } catch (error) {
      // On network error, reset cache for next attempt
      resetApiPortCache();
      throw error;
    }
  }, []);

  return {
    apiFetch,
    apiReady,
    loading,
    getWebSocketUrl,
  };
}