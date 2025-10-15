// API Configuration for frontend
// In development: uses relative URLs (proxied by Vite)
// In production: uses environment variable or defaults to same origin

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Helper function to construct API URLs
export const getApiUrl = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  if (API_BASE_URL) {
    return `${API_BASE_URL}/${cleanPath}`;
  }
  
  // Default: use relative path (same origin)
  return `/${cleanPath}`;
};
