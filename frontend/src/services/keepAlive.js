// Keep-alive service to prevent Render free tier from spinning down
// Pings the backend health endpoint every 10 minutes (Render spins down after 15 min inactivity)

import { API_BASE, KEEP_ALIVE_INTERVAL } from '../config/api';

const PING_INTERVAL = KEEP_ALIVE_INTERVAL * 60 * 1000; // Convert minutes to milliseconds
const HEALTH_ENDPOINT = '/health';

let pingInterval = null;

/**
 * Start pinging the backend to keep it alive
 */
export function startKeepAlive() {
  // Don't start multiple intervals
  if (pingInterval) {
    return;
  }

  // Ping immediately on start
  pingBackend();

  // Then ping every 10 minutes
  pingInterval = setInterval(() => {
    pingBackend();
  }, PING_INTERVAL);

  console.log('🔄 Keep-alive service started (pinging every 10 minutes)');
}

/**
 * Stop pinging the backend
 */
export function stopKeepAlive() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
    console.log('⏹️ Keep-alive service stopped');
  }
}

/**
 * Ping the backend health endpoint
 */
async function pingBackend() {
  try {
    const healthUrl = API_BASE.replace('/v1', HEALTH_ENDPOINT);
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      // Don't block on response
      cache: 'no-cache',
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Keep-alive ping successful:', data.status);
    } else {
      console.warn('⚠️ Keep-alive ping failed:', response.status);
    }
  } catch (error) {
    // Silently fail - don't spam console with errors
    // This is just a keep-alive, not critical functionality
    if (error.name !== 'AbortError') {
      console.debug('Keep-alive ping error (non-critical):', error.message);
    }
  }
}

// Auto-start when module is imported
// Works in both development and production
startKeepAlive();

