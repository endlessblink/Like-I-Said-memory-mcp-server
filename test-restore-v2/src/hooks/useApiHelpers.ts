import { useCallback } from 'react';
import { getApiUrl } from '@/utils/apiConfig';

export function useApiHelpers() {
  const apiGet = useCallback(async (path: string) => {
    const url = await getApiUrl(path);
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response;
  }, []);

  const apiPost = useCallback(async (path: string, data?: any) => {
    const url = await getApiUrl(path);
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return response;
  }, []);

  const apiPut = useCallback(async (path: string, data?: any) => {
    const url = await getApiUrl(path);
    const response = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return response;
  }, []);

  const apiDelete = useCallback(async (path: string) => {
    const url = await getApiUrl(path);
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response;
  }, []);

  return {
    apiGet,
    apiPost,
    apiPut,
    apiDelete,
  };
}