import { getApiUrl } from './apiConfig';

interface ApiOptions extends RequestInit {
  skipCredentials?: boolean;
}

/**
 * Wrapper around fetch that includes credentials and proper error handling
 */
export async function apiFetch(path: string, options: ApiOptions = {}): Promise<Response> {
  const { skipCredentials, ...fetchOptions } = options;
  
  // Get the full API URL
  const url = await getApiUrl(path);
  
  // Default options
  const defaultOptions: RequestInit = {
    mode: 'cors',
    credentials: skipCredentials ? 'omit' : 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  // Merge options
  const finalOptions = {
    ...defaultOptions,
    ...fetchOptions,
    headers: {
      ...defaultOptions.headers,
      ...fetchOptions.headers,
    },
  };
  
  try {
    const response = await fetch(url, finalOptions);
    
    // Check for authentication errors
    if (response.status === 401) {
      // Handle unauthorized access
      console.warn('Unauthorized access - authentication may be required');
    }
    
    return response;
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
}

/**
 * Helper for GET requests
 */
export async function apiGet(path: string, options?: ApiOptions): Promise<any> {
  const response = await apiFetch(path, {
    method: 'GET',
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Helper for POST requests
 */
export async function apiPost(path: string, data?: any, options?: ApiOptions): Promise<any> {
  const response = await apiFetch(path, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Helper for PUT requests
 */
export async function apiPut(path: string, data?: any, options?: ApiOptions): Promise<any> {
  const response = await apiFetch(path, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Helper for DELETE requests
 */
export async function apiDelete(path: string, options?: ApiOptions): Promise<any> {
  const response = await apiFetch(path, {
    method: 'DELETE',
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}