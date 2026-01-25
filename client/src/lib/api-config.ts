// API Configuration for separate hosting
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * Get the full API URL
 * - In development: returns empty string (uses proxy or same origin)
 * - In production: returns the backend URL from VITE_API_URL env var
 */
export function getApiUrl(path: string): string {
    // If path already includes protocol, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Fetch wrapper that automatically prepends API base URL
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
    const url = getApiUrl(path);

    // Always include credentials for cookie-based auth
    const fetchOptions: RequestInit = {
        ...options,
        credentials: 'include',
    };

    return fetch(url, fetchOptions);
}
