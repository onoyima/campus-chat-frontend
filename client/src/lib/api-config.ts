// Use environment variable if set, otherwise fallback based on mode:
// Development -> localhost:5000
// Production -> https://veritas-uk6l.onrender.com
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5000" : "https://veritas-uk6l.onrender.com");

export const buildUrl = (path: string) => {
    // If path starts with http, return it
    if (path.startsWith('http')) return path;

    // Remove leading slash from path if base url has trailing slash
    const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    return `${cleanBase}${cleanPath}`;
};

export function getAuthHeaders(contentType: string | null = "application/json"): HeadersInit {
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {};

    if (contentType) {
        headers["Content-Type"] = contentType;
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}
