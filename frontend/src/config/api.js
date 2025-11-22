// API Configuration
// Uses environment variable if set, otherwise falls back to auto-detection

const getApiBaseUrl = () => {
  // Check for explicit environment variable (highest priority)
  if (import.meta.env.VITE_API_BASE_URL) {
    const url = import.meta.env.VITE_API_BASE_URL.trim();
    // Ensure it ends with /v1
    return url.endsWith('/v1') ? url : `${url}/v1`;
  }
  
  // Auto-detect based on build mode
  const isProduction = import.meta.env.PROD;
  return isProduction 
    ? 'https://truthchain-drow.onrender.com/v1'
    : 'http://localhost:3000/v1';
};

export const API_BASE = getApiBaseUrl();

// Sui Network configuration
export const SUI_NETWORK = import.meta.env.VITE_SUI_NETWORK || 'testnet';

// Keep-alive interval (in minutes)
export const KEEP_ALIVE_INTERVAL = parseInt(import.meta.env.VITE_KEEP_ALIVE_INTERVAL || '10', 10);

export default API_BASE;

