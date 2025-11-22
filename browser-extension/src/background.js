const API_BASE = 'https://truthchain-drow.onrender.com/v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const hashCache = new Map(); // Map<hash, { cachedAt, ...result }>
const pendingHashRequests = new Map(); // Map<hash, Promise>

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}

function storageSet(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

function storageRemove(key) {
  return new Promise((resolve) => {
    chrome.storage.local.remove([key], resolve);
  });
}

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'verify-media',
    title: 'Verify with TruthChain',
    contexts: ['image', 'video']
  });
  chrome.contextMenus.create({
    id: 'register-media',
    title: 'Register with TruthChain',
    contexts: ['image', 'video']
  });
});

const injectedTabs = new Set();

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  
  const mediaUrl = info.srcUrl;
  
  if (info.menuItemId === 'verify-media') {
    console.log('Context menu clicked, verifying media:', mediaUrl);
    await sendVerifyRequest(tab.id, mediaUrl);
  } else if (info.menuItemId === 'register-media') {
    console.log('Context menu clicked, registering media:', mediaUrl);
    await sendRegisterRequest(tab.id, mediaUrl);
  }
});

async function sendVerifyRequest(tabId, mediaUrl) {
  try {
    console.log('Attempting to send message to content script...');
    const response = await sendMessageToContentScript(tabId, { action: 'verify-media', url: mediaUrl });
    console.log('Message sent to content script successfully, response:', response);
    return;
  } catch (error) {
    console.warn('Initial message send failed, injecting content script...', error.message);
  }

  // If initial send failed, inject and retry
  try {
    await ensureContentScriptInjected(tabId);
    console.log('Content script injected, waiting 800ms for script to initialize...');
    await delay(800); // Give more time for script to set up listeners
    
    // Try multiple times with increasing delays
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Retry attempt ${attempt}...`);
        const response = await sendMessageToContentScript(tabId, { action: 'verify-media', url: mediaUrl });
        console.log('✅ Message sent after injection, response:', response);
        return;
      } catch (retryError) {
        console.warn(`Retry ${attempt} failed:`, retryError.message);
        if (attempt < 3) {
          await delay(300 * attempt); // Exponential backoff
        } else {
          throw retryError;
        }
      }
    }
  } catch (injectError) {
    console.error('❌ Failed to inject or communicate with content script:', injectError);
    console.error('Error details:', injectError.message);
  }
}

function sendMessageToContentScript(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      message,
      (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(response);
      }
    );
  });
}

async function ensureContentScriptInjected(tabId) {
  if (injectedTabs.has(tabId)) {
    console.log('Content script already marked as injected for tab', tabId);
    return;
  }

  try {
    console.log('Injecting content script into tab', tabId);
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/content.js']
    });
    console.log('Content script injection completed');
    injectedTabs.add(tabId);
  } catch (error) {
    console.error('Failed to inject content script:', error);
    throw error;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  if (request.action === 'verify-hash') {
    console.log('Processing verify-hash request for:', request.hash);
    verifyHash(request.hash)
      .then(result => {
        console.log('Verification complete, sending result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('Verification error in background:', error);
        sendResponse({ status: 'error', message: error.message });
      });
    return true; // Keep channel open for async response
  } else if (request.action === 'register-hash') {
    console.log('Processing register-hash request for:', request.hash);
    registerHash(request.hash, request.metadata)
      .then(result => {
        console.log('Registration complete, sending result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('Registration error in background:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
});

async function verifyHash(hash) {
  const cached = await getCachedVerification(hash);
  if (cached) {
    console.log('Serving cached verification result for hash:', hash);
    return cached;
  }

  if (pendingHashRequests.has(hash)) {
    console.log('Waiting for pending verification request for hash:', hash);
    return pendingHashRequests.get(hash);
  }

  const verifyPromise = (async () => {
    try {
      console.log('Verifying hash:', hash);
      const response = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hash })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Verification result:', result);

      await setCachedVerification(hash, result);
      return result;
    } catch (error) {
      console.error('Verification failed:', error);
      return {
        status: 'error',
        message: error.message
      };
    } finally {
      pendingHashRequests.delete(hash);
    }
  })();

  pendingHashRequests.set(hash, verifyPromise);
  return verifyPromise;
}

async function registerHash(hash, metadata = {}) {
  try {
    console.log('Registering hash:', hash, 'with metadata:', metadata);
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hash,
        source: metadata.source || 'Browser Extension',
        mediaType: metadata.mediaType || 'photo',
        isAiGenerated: metadata.isAiGenerated || false,
        metadata: JSON.stringify(metadata)
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Registration result:', result);

    await clearCachedVerification(hash);

    return result;

  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

async function getCachedVerification(hash) {
  const now = Date.now();

  const cachedInMemory = hashCache.get(hash);
  if (cachedInMemory && now - cachedInMemory.cachedAt < CACHE_TTL_MS) {
    return cachedInMemory;
  }

  if (cachedInMemory) {
    hashCache.delete(hash);
  }

  const key = `hash_${hash}`;
  const stored = await storageGet(key);
  if (stored && now - stored.cachedAt < CACHE_TTL_MS) {
    hashCache.set(hash, stored);
    return stored;
  }

  if (stored) {
    await storageRemove(key);
  }

  return null;
}

async function setCachedVerification(hash, result) {
  const cachedValue = {
    ...result,
    cachedAt: Date.now()
  };
  hashCache.set(hash, cachedValue);
  await storageSet(`hash_${hash}`, cachedValue);
  return cachedValue;
}

async function clearCachedVerification(hash) {
  hashCache.delete(hash);
  await storageRemove(`hash_${hash}`);
}

async function sendRegisterRequest(tabId, mediaUrl) {
  try {
    console.log('Attempting to send register request to content script...');
    const response = await sendMessageToContentScript(tabId, { action: 'register-media', url: mediaUrl });
    console.log('Register message sent to content script successfully, response:', response);
    return;
  } catch (error) {
    console.warn('Initial register message send failed, injecting content script...', error.message);
  }

  // If initial send failed, inject and retry
  try {
    await ensureContentScriptInjected(tabId);
    console.log('Content script injected for registration, waiting 800ms...');
    await delay(800);
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Register retry attempt ${attempt}...`);
        const response = await sendMessageToContentScript(tabId, { action: 'register-media', url: mediaUrl });
        console.log('✅ Register message sent after injection, response:', response);
        return;
      } catch (retryError) {
        console.warn(`Register retry ${attempt} failed:`, retryError.message);
        if (attempt < 3) {
          await delay(300 * attempt);
        } else {
          throw retryError;
        }
      }
    }
  } catch (injectError) {
    console.error('❌ Failed to inject or communicate with content script for registration:', injectError);
  }
}