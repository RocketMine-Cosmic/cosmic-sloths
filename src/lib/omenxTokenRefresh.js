import { base44 } from '@/api/base44Client';
import { saveAuthToIndexedDB } from '@/lib/indexedDbAuth';

/**
 * Refreshes the OmenX access token via backend.
 * Updates localStorage and IndexedDB on success.
 */
export async function refreshOmenXAccessToken() {
  try {
    const res = await base44.functions.invoke('refreshOmenXToken', {});
    
    if (!res.data?.success || !res.data?.accessToken) {
      throw new Error('No access token in response');
    }

    const newToken = res.data.accessToken;
    
    // Update localStorage
    const auth = JSON.parse(localStorage.getItem('omenx_auth_data') || '{}');
    auth.accessToken = newToken;
    localStorage.setItem('omenx_auth_data', JSON.stringify(auth));

    // Update IndexedDB
    await saveAuthToIndexedDB(auth);

    return newToken;
  } catch (error) {
    console.error('[refreshOmenXAccessToken] Failed:', error);
    throw error;
  }
}

/**
 * Wraps an OmenX API call with auto-refresh on 401.
 */
export async function withOmenXRefresh(apiCall) {
  try {
    return await apiCall();
  } catch (error) {
    // If 401, try refresh once and retry
    if (error?.response?.status === 401) {
      console.log('[withOmenXRefresh] Got 401, attempting refresh...');
      try {
        const newToken = await refreshOmenXAccessToken();
        console.log('[withOmenXRefresh] Refresh succeeded, retrying call');
        // Retry with new token
        return await apiCall(newToken);
      } catch (refreshError) {
        console.error('[withOmenXRefresh] Refresh failed:', refreshError);
        throw error; // Re-throw original 401
      }
    }
    throw error;
  }
}