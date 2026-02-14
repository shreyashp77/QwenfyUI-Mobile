
declare const __API_TOKEN__: string;

/**
 * Wrapper around fetch() that automatically injects the API authentication token.
 * Use this for all calls to custom /api/* endpoints on the Vite dev server.
 */
export const authenticatedFetch = (url: string, options?: RequestInit): Promise<Response> => {
    const headers = new Headers(options?.headers);
    headers.set('Authorization', `Bearer ${__API_TOKEN__}`);
    return fetch(url, { ...options, headers });
};
