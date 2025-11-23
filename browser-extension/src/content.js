// Log that content script is loaded
console.log('✅ TruthChain content script loaded at', new Date().toISOString());
console.log('Content script location:', window.location.href);

// Store badges per media URL to support multiple badges
const mediaBadges = new Map(); // Map<mediaUrl, { badge, element, cleanup }>

// Auto-verification settings (explicitly disabled)
let autoVerifyEnabled = false;
const verifiedHashes = new Set(); // Cache of verified hashes to avoid re-verifying
const processedAutoHashes = new Set(); // Hashes already checked during auto-verify
const verifyingUrls = new Set(); // Track media URLs currently being processed
const verifiedMediaUrls = new Set(); // Track URLs already processed (even if unknown)
const hoverOverlays = new Map(); // Map<mediaUrl, { overlay, cleanup, hideTimeout }>
const mediaStatus = new Map(); // Map<mediaUrl, verificationResult>

let sidebarElement = null;
let sidebarBackdrop = null;
let sidebarContent = null;
let sidebarActiveMediaUrl = null;

function getMediaUrlFromElement(element) {
  if (!element) return null;
  return (
    element.currentSrc ||
    element.src ||
    element.getAttribute('src') ||
    element.dataset?.src ||
    element.poster ||
    null
  );
}

// Global flag to prevent multiple overlays from being created simultaneously
let isCreatingOverlay = false;
let currentActiveOverlayUrl = null;

function attachMediaHoverListeners(element) {
  if (!element || element.dataset.truthchainHoverBound === 'true') {
    return;
  }
  
  // Skip if element is inside a button or is a button itself
  if (element.closest('button') || element.tagName === 'BUTTON') {
    return;
  }
  
  // Skip if element is inside an anchor tag that looks like a button
  const parentLink = element.closest('a');
  if (parentLink && (
    parentLink.classList.contains('button') ||
    parentLink.classList.contains('btn') ||
    parentLink.getAttribute('role') === 'button'
  )) {
    return;
  }
  
  // Only attach to actual img or video elements
  if (element.tagName !== 'IMG' && element.tagName !== 'VIDEO') {
    return;
  }
  
  // Remove size check - show on all images regardless of size
  element.dataset.truthchainHoverBound = 'true';

  let hoverTimeout = null;
  const handleEnter = (e) => {
    // Don't stop propagation - let other handlers work too
    // Only prevent default if needed
    if (e.cancelable) {
      e.preventDefault();
    }
    
    // Debounce hover to prevent multiple overlays
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    hoverTimeout = setTimeout(() => {
      // Check if we're already showing an overlay for this element
      const mediaUrl = getMediaUrlFromElement(element);
      if (mediaUrl && currentActiveOverlayUrl === mediaUrl) {
        return; // Already showing overlay for this media
      }
      
      // Remove badge from any previously hovered image
      if (currentActiveOverlayUrl && currentActiveOverlayUrl !== mediaUrl) {
        removeBadgeForImage(currentActiveOverlayUrl);
      }
      
      showHoverOverlay(element);
      // Also show badge if verification status exists
      if (mediaUrl) {
        const status = mediaStatus.get(mediaUrl);
        if (status) {
          // Show appropriate badge based on status
          if (status.status === 'verified') {
            showVerificationBadge(mediaUrl, status);
          } else if (status.status === 'error') {
            showErrorBadge(mediaUrl, status.message || 'Error');
          } else if (status.status === 'unknown') {
            showVerificationBadge(mediaUrl, status);
          }
        } else {
          // If no status yet, verify in background (will show badge on next hover)
          verifyMedia(mediaUrl, false).catch(() => {
            // Silently fail - badge will show on next hover if status is available
          });
        }
      }
    }, 50); // Reduced debounce for faster response
  };
  const handleLeave = (e) => {
    // Don't stop propagation - let other handlers work too
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    
    // Immediately hide overlay and badge when cursor leaves
    const mediaUrl = getMediaUrlFromElement(element);
    if (mediaUrl) {
      // Remove badge immediately (no delay)
      removeBadgeForImage(mediaUrl);
    }
    hideHoverOverlay(element);
  };

  // Use capture phase for all elements to ensure we catch events before other handlers
  // This is critical for sites that stop event propagation
  element.addEventListener('mouseenter', handleEnter, true);
  element.addEventListener('mouseleave', handleLeave, true);
  
  // Also attach to parent container for better hover detection
  // This helps with sites that have complex DOM structures
  const parent = element.parentElement;
  if (parent && !parent.dataset.truthchainHoverBound) {
    parent.dataset.truthchainHoverBound = 'true';
    parent.addEventListener('mouseenter', (e) => {
      // Only trigger if the event target is our image/video
      if (e.target === element || element.contains(e.target)) {
        handleEnter(e);
      }
    }, true);
    parent.addEventListener('mouseleave', (e) => {
      // Only trigger if we're leaving the parent and not entering the image
      if (!element.contains(e.relatedTarget) && e.relatedTarget !== element) {
        handleLeave(e);
      }
    }, true);
  }
}

function initializeMediaHoverSystem() {
  // Use a more aggressive approach - attach to all images/videos first
  // Then filter out problematic ones
  const images = document.querySelectorAll('img');
  const videos = document.querySelectorAll('video');
  const mediaElements = [...images, ...videos];
  
  console.log(`Initializing hover system: ${images.length} images, ${videos.length} videos`);
  
  mediaElements.forEach((element) => {
    // Skip if already bound
    if (element.dataset.truthchainHoverBound === 'true') {
      return;
    }
    
    // Filter out images/videos that are buttons or inside buttons
    if (element.closest('button') || element.tagName === 'BUTTON') {
      return;
    }
    
    // Filter out images/videos inside button-like links
    const parentLink = element.closest('a');
    if (parentLink && (
      parentLink.classList.contains('button') ||
      parentLink.classList.contains('btn') ||
      parentLink.getAttribute('role') === 'button'
    )) {
      return;
    }
    
    // Try to get media URL - if it fails, still attach listeners
    // (some images might load lazily)
    const mediaUrl = getMediaUrlFromElement(element);
    
    // Attach listeners even if URL is not available yet
    // The URL might be available on hover
    attachMediaHoverListeners(element);
  });

  // Hide all overlays on scroll
  let scrollTimeout = null;
  const handleScroll = () => {
    // Hide all overlays immediately when scrolling
    hoverOverlays.forEach((overlayData, mediaUrl) => {
      if (overlayData.overlay) {
        overlayData.overlay.style.opacity = '0';
        overlayData.overlay.style.pointerEvents = 'none';
      }
    });

    // Clear any pending hide timeouts
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(() => {
      // After scroll stops, check visibility and clean up
      hoverOverlays.forEach((overlayData, mediaUrl) => {
        const element = findMediaByUrl(mediaUrl);
        if (!element) {
          // Element removed, clean up overlay
          if (overlayData.cleanup) overlayData.cleanup();
          if (overlayData.overlay?.parentElement) {
            overlayData.overlay.parentElement.removeChild(overlayData.overlay);
          }
          hoverOverlays.delete(mediaUrl);
        } else {
          // Check if element is still visible
          const rect = element.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 &&
            rect.top >= -1000 && rect.left >= -1000 &&
            rect.bottom <= window.innerHeight + 1000 &&
            rect.right <= window.innerWidth + 1000;
          
          if (!isVisible && overlayData.overlay) {
            overlayData.overlay.style.opacity = '0';
            overlayData.overlay.style.pointerEvents = 'none';
          }
        }
      });
    }, 150);
  };

  window.addEventListener('scroll', handleScroll, true);
  window.addEventListener('wheel', handleScroll, { passive: true });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.tagName === 'IMG' || node.tagName === 'VIDEO') {
          // Skip if inside a button
          if (node.closest('button') || node.tagName === 'BUTTON') {
            return;
          }
          
          // Small delay for videos to ensure they're fully initialized
          if (node.tagName === 'VIDEO') {
            setTimeout(() => attachMediaHoverListeners(node), 100);
          } else {
            attachMediaHoverListeners(node);
          }
        } else {
          // Only get images/videos that are not inside buttons
          const nestedImages = node.querySelectorAll?.('img:not(button img)');
          const nestedVideos = node.querySelectorAll?.('video:not(button video)');
          
          nestedImages?.forEach((img) => {
            if (!img.closest('button')) {
              attachMediaHoverListeners(img);
            }
          });
          
          nestedVideos?.forEach((video) => {
            if (!video.closest('button')) {
              setTimeout(() => attachMediaHoverListeners(video), 100);
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  
  // Re-scan periodically for videos that might have been missed
  setInterval(() => {
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      if (!video.dataset.truthchainHoverBound) {
        attachMediaHoverListeners(video);
      }
    });
  }, 2000);
}

function ensureRuntimeAvailable() {
  try {
    if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
      return false;
    }
    // Test if runtime is actually available by trying to access getURL
    if (chrome.runtime.getURL) {
      try {
        chrome.runtime.getURL('test');
      } catch (e) {
        // Context invalidated - return false silently (error will be handled by caller)
        return false;
      }
    }
    return true;
  } catch (error) {
    // Context invalidated - return false silently
    return false;
  }
}

function sendMessageToBackground(message) {
  if (!ensureRuntimeAvailable()) {
    return Promise.reject(new Error('Extension context invalidated. Please reload the page.'));
  }
  return new Promise((resolve, reject) => {
    try {
      // Double-check runtime is available before sending
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        reject(new Error('Extension context invalidated. Please reload the page.'));
        return;
      }
      
      chrome.runtime.sendMessage(message, (response) => {
        // Check for runtime errors
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message;
          if (errorMsg.includes('Extension context invalidated') || 
              errorMsg.includes('message port closed') ||
              errorMsg.includes('Receiving end does not exist')) {
            console.warn('Extension context invalidated. Please reload the page.');
            reject(new Error('Extension context invalidated. Please reload the page.'));
          } else {
            reject(new Error(errorMsg));
          }
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      // Catch any synchronous errors (like when runtime is invalidated)
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('Extension context invalidated') || 
          errorMsg.includes('Cannot access') ||
          errorMsg.includes('getURL')) {
        console.warn('Extension context invalidated during message send:', error);
        reject(new Error('Extension context invalidated. Please reload the page.'));
      } else {
        reject(error);
      }
    }
  });
}

// Ensure auto verification stays disabled in storage
try {
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ autoVerifyEnabled: false });
  }
} catch (error) {
  console.warn('Could not set storage (extension context may be invalidated):', error);
}

// Listen for verify and register commands
try {
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Content script received message:', request);
      if (request.action === 'verify-media') {
        console.log('Content script received verify request for:', request.url);
        verifyMedia(request.url)
          .then(() => {
            console.log('verifyMedia completed successfully');
            sendResponse({ success: true });
          })
          .catch(error => {
            console.error('Error in verifyMedia:', error);
            showErrorBadge(request.url, error.message);
            sendResponse({ success: false, error: error.message });
          });
        return true; // Indicates we will respond asynchronously
      } else if (request.action === 'register-media') {
        console.log('Content script received register request for:', request.url);
        registerMedia(request.url)
          .then(() => {
            console.log('registerMedia completed successfully');
            sendResponse({ success: true });
          })
          .catch(error => {
            console.error('Error in registerMedia:', error);
            showErrorBadge(request.url, error.message);
            sendResponse({ success: false, error: error.message });
          });
        return true; // Indicates we will respond asynchronously
      }
      return false;
    });
  }
} catch (error) {
  console.warn('Could not set up message listener (extension context may be invalidated):', error);
}
  
  async function verifyMedia(mediaUrl, showBadge = true) {
    // Prevent duplicate verifications for the same URL
    if (verifyingUrls.has(mediaUrl)) {
      console.log('Already verifying this media, skipping:', mediaUrl);
      return null;
    }
    
    try {
      verifyingUrls.add(mediaUrl);
      
      // Loading badges are now hover-based, not shown immediately
  
      // Try to fetch the media - handle CORS issues
      let response;
      try {
        response = await fetch(mediaUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (fetchError) {
        // If direct fetch fails (CORS), use backend proxy
        console.warn('Direct fetch failed, trying backend proxy:', fetchError);
        try {
          const proxyUrl = `https://truthchain-drow.onrender.com/v1/proxy?url=${encodeURIComponent(mediaUrl)}`;
          response = await fetch(proxyUrl);
          if (!response.ok) {
            throw new Error(`Proxy fetch failed: HTTP ${response.status}`);
          }
          console.log('Successfully fetched via proxy');
        } catch (proxyError) {
          console.error('Proxy fetch also failed:', proxyError);
          throw new Error(`Cannot fetch media due to CORS restrictions. Please ensure the media is accessible.`);
        }
      }
      
      const blob = await response.blob();
      const mediaType = blob.type.startsWith('video/') ? 'video' : 'photo';
      console.log(`${mediaType} fetched, calculating hash...`);
      
      // Store original blob for fallback verification (before normalization)
      const originalBlob = blob.type.startsWith('image/') ? blob : null;
      
      // For videos, we might want to hash just the first frame or a sample
      // For now, hash the entire file (might be slow for large videos)
      const hash = await calculateHash(blob);
      console.log('Hash calculated:', hash);
      const isAuto = !showBadge;
      
      if (isAuto && processedAutoHashes.has(hash)) {
        console.log('Hash already processed in auto mode, skipping:', hash);
        return null;
      }
      
      // Check cache first
      if (verifiedHashes.has(hash)) {
        console.log('Hash found in cache, already verified');
        // Don't show badge immediately - it will show on hover
        verifyingUrls.delete(mediaUrl);
        return { status: 'verified', hash };
      }
  
      // Use Promise-based message sending
      console.log('Sending hash to background script for verification...');
      let result = await sendMessageToBackground({
        action: 'verify-hash',
        hash
      });
  
      // If verification fails with normalized hash, try non-normalized hash as fallback
      // This handles images registered before normalization was added
      if (result.status !== 'verified' && originalBlob) {
        console.log('Normalized hash not found, trying non-normalized hash as fallback...');
        const nonNormalizedHash = await calculateHashWithoutNormalization(originalBlob);
        console.log('Non-normalized hash:', nonNormalizedHash);
        if (nonNormalizedHash !== hash) {
          const fallbackResult = await sendMessageToBackground({
            action: 'verify-hash',
            hash: nonNormalizedHash
          });
          if (fallbackResult.status === 'verified') {
            console.log('Found match with non-normalized hash (image registered before normalization)');
            result = fallbackResult;
            // Cache with the normalized hash so future verifications work
            verifiedHashes.add(hash);
          }
        }
      }
  
      // Cache verified hashes
      if (result.status === 'verified') {
        verifiedHashes.add(hash);
      }

      mediaStatus.set(mediaUrl, { ...result, hash });
      updateOverlayStatus(mediaUrl);
      updateSidebarWithResult(mediaUrl, { ...result, hash });
      
      // Don't show badge immediately - it will show on hover
      // Badges are now hover-based, not permanent
      
      if (isAuto) {
        processedAutoHashes.add(hash);
      }
      
      return result;
  
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isContextInvalidated = errorMsg.includes('Extension context invalidated') || 
                                    errorMsg.includes('message port closed') ||
                                    errorMsg.includes('Receiving end does not exist');
      
      if (isContextInvalidated) {
        console.warn('Extension context invalidated during verification. Please reload the page.');
        mediaStatus.set(mediaUrl, { 
          status: 'error', 
          message: 'Extension context invalidated. Please reload the page to continue using TruthChain.' 
        });
      } else {
        console.error('Verification error:', error);
        mediaStatus.set(mediaUrl, { status: 'error', message: errorMsg });
      }
      
      updateOverlayStatus(mediaUrl);
      updateSidebarWithResult(mediaUrl, error instanceof Error ? error : new Error(errorMsg));
      // Don't show error badge immediately - it will show on hover if needed
      // Badges are now hover-based, not permanent
      
      // Don't throw context invalidation errors - they're expected when extension reloads
      if (!isContextInvalidated) {
        throw error;
      }
    } finally {
      verifyingUrls.delete(mediaUrl);
    }
  }
  
  // Auto-verification: Scan and verify all images/videos on page
  async function startAutoVerification() {
    console.log('Starting auto-verification...');
    
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(scanAndVerifyMedia, 1000); // Wait 1s for images to load
      });
    } else {
      setTimeout(scanAndVerifyMedia, 1000);
    }
    
    // Also scan for dynamically loaded content
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'IMG' || node.tagName === 'VIDEO' || 
                node.querySelector('img') || node.querySelector('video')) {
              shouldScan = true;
            }
          }
        });
      });
      if (shouldScan) {
        setTimeout(scanAndVerifyMedia, 500); // Debounce
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  async function scanAndVerifyMedia() {
    if (!autoVerifyEnabled) return;
    
    const images = document.querySelectorAll('img[src]');
    const videos = document.querySelectorAll('video[src]');
    const allMedia = [...images, ...videos];
    
    console.log(`Found ${allMedia.length} media elements to verify`);
    
    // Limit to first 20 to avoid performance issues
    const mediaToVerify = Array.from(allMedia).slice(0, 20);
    
    for (const element of mediaToVerify) {
      const mediaUrl = element.src || element.currentSrc;
      if (!mediaUrl || 
          mediaUrl.startsWith('data:') || 
          mediaBadges.has(mediaUrl) || 
          verifiedMediaUrls.has(mediaUrl)) {
        continue; // Skip data URLs, already verified, or already processing
      }
      
      // Mark as being processed
      verifiedMediaUrls.add(mediaUrl);
      
      try {
        // Verify silently (badges will show on hover)
        const result = await verifyMedia(mediaUrl, false);
        // Don't show badge immediately - badges are hover-based
      } catch (error) {
        // Silently fail for auto-verification
        const message = error instanceof Error ? error.message : String(error);
        console.log('Auto-verify failed for:', mediaUrl, message);
        
        if (message.includes('Extension context invalidated')) {
          console.warn('Extension context invalidated. Stopping auto-verification until page reload.');
          autoVerifyEnabled = false;
          return;
        }
        
        // Remove from set on error so it can be retried later if needed
        verifiedMediaUrls.delete(mediaUrl);
      }
      
      // Add small delay between verifications
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  /**
   * Normalize image by re-encoding it through canvas to strip metadata
   * This ensures consistent hashing even if metadata differs
   */
  async function normalizeImage(blob) {
    // Only normalize images, not videos
    if (!blob.type.startsWith('image/')) {
      return blob;
    }
    
    try {
      // Create image from blob
      const imageUrl = URL.createObjectURL(blob);
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageUrl;
      });
      
      // Create canvas and draw image (this strips metadata)
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { 
        willReadFrequently: false,
        alpha: true,
        desynchronized: false
      });
      
      // Clear canvas to ensure consistent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw image (this strips all metadata)
      ctx.drawImage(img, 0, 0);
      
      // Convert back to blob (normalized, no metadata)
      // Always use PNG format for consistency - this ensures the same image always produces the same hash
      // regardless of original format (JPEG, WebP, etc.)
      const normalizedBlob = await new Promise((resolve) => {
        canvas.toBlob((normalized) => {
          URL.revokeObjectURL(imageUrl);
          if (!normalized) {
            console.warn('Canvas toBlob returned null, using original blob');
            resolve(blob);
            return;
          }
          // Ensure the blob has the correct type
          const typedBlob = new Blob([normalized], { type: 'image/png' });
          console.log('Image normalized successfully:', {
            originalType: blob.type,
            originalSize: blob.size,
            normalizedType: typedBlob.type,
            normalizedSize: typedBlob.size
          });
          resolve(typedBlob);
        }, 'image/png', 1.0); // Always use PNG for consistent hashing, max quality
      });
      
      return normalizedBlob || blob; // Fallback to original if normalization fails
    } catch (error) {
      console.warn('Failed to normalize image, using original:', error);
      return blob; // Fallback to original blob if normalization fails
    }
  }
  
  // Calculate hash without normalization (for fallback verification)
  async function calculateHashWithoutNormalization(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  async function calculateHash(blob) {
    // Normalize image first to strip metadata and ensure consistent hashing
    console.log('Calculating hash for blob type:', blob.type, 'size:', blob.size);
    const normalizedBlob = await normalizeImage(blob);
    console.log('Normalized blob type:', normalizedBlob.type, 'size:', normalizedBlob.size, 'was normalized:', normalizedBlob !== blob);
    const arrayBuffer = await normalizedBlob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('Calculated hash:', hash);
    return hash;
  }
  
  function findMediaByUrl(mediaUrl) {
    if (!mediaUrl) return null;
    
    // Check if we're in fullscreen mode and search there first
    const fullscreenElement = document.fullscreenElement || 
                              document.webkitFullscreenElement || 
                              document.mozFullScreenElement || 
                              document.msFullscreenElement;
    
    const searchRoot = fullscreenElement || document;
    
    // Normalize URLs for comparison (remove query params, fragments, etc.)
    const normalizeUrl = (url) => {
      if (!url) return '';
      try {
        const urlObj = new URL(url);
        // Remove query params and fragments for comparison
        return urlObj.origin + urlObj.pathname;
      } catch {
        // If URL parsing fails, just return as-is
        return url.split('?')[0].split('#')[0];
      }
    };
    
    const normalizedTarget = normalizeUrl(mediaUrl);
    
    // Try exact match first
    let img = searchRoot.querySelector(`img[src="${mediaUrl}"]`);
    if (img) return img;
    
    let video = searchRoot.querySelector(`video[src="${mediaUrl}"]`);
    if (video) return video;
    
    // Try matching with currentSrc (handles srcset)
    const allImages = searchRoot.querySelectorAll('img');
    const allVideos = searchRoot.querySelectorAll('video');
    const allMedia = [...allImages, ...allVideos];
    
    for (const element of allMedia) {
      // Check multiple possible sources
      const sources = [
        element.src,
        element.currentSrc,
        element.getAttribute('src'),
        element.getAttribute('data-src'),
        element.getAttribute('data-lazy-src'),
        element.getAttribute('data-original'),
      ].filter(Boolean);
      
      // Also check srcset
      if (element.srcset) {
        const srcsetUrls = element.srcset.split(',').map(s => s.trim().split(' ')[0]);
        sources.push(...srcsetUrls);
      }
      
      for (const src of sources) {
        if (!src) continue;
        
        // Exact match
        if (src === mediaUrl) {
          return element;
        }
        
        // Normalized match (ignores query params)
        if (normalizeUrl(src) === normalizedTarget) {
          return element;
        }
        
        // Partial match (for URLs with different query params)
        const normalizedSrc = normalizeUrl(src);
        if (normalizedSrc && (normalizedSrc.includes(normalizedTarget) || normalizedTarget.includes(normalizedSrc))) {
          return element;
        }
      }
    }
    
    // If still not found, return null silently (don't log warning for every failed lookup)
    return null;
  }
  
  // Keep old function name for backward compatibility
  const findImageByUrl = findMediaByUrl;


function getOverlayLabel(status) {
  if (!status) return 'Verify with TruthChain';
  if (status.status === 'verified') return '✅ Verified';
  if (status.status === 'unknown') return 'Check authenticity';
  if (status.status === 'error') return 'Retry verification';
  return 'Verify with TruthChain';
}

function createTruthChainIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 512 512');
  svg.style.display = 'block';
  
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  gradient.setAttribute('id', 'tcGrad');
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '100%');
  gradient.setAttribute('y2', '100%');
  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', '#0EA5E9');
  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', '#06B6D4');
  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
  svg.appendChild(defs);
  
  // Simplified chain + checkmark icon
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', 'translate(256, 256) scale(0.15)');
  
  // Chain links (simplified)
  const link1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  link1.setAttribute('d', 'M -40 -20 Q -40 -30 -30 -30 Q -20 -30 -20 -20 Q -20 -10 -30 -10 Q -40 -10 -40 -20 Z M 20 -20 Q 20 -30 30 -30 Q 40 -30 40 -20 Q 40 -10 30 -10 Q 20 -10 20 -20 Z');
  link1.setAttribute('fill', 'none');
  link1.setAttribute('stroke', 'url(#tcGrad)');
  link1.setAttribute('stroke-width', '4');
  link1.setAttribute('stroke-linecap', 'round');
  
  const link2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  link2.setAttribute('d', 'M -20 0 Q -20 -10 -10 -10 Q 0 -10 0 0 Q 0 10 -10 10 Q -20 10 -20 0 Z M 0 0 Q 0 -10 10 -10 Q 20 -10 20 0 Q 20 10 10 10 Q 0 10 0 0 Z');
  link2.setAttribute('fill', 'none');
  link2.setAttribute('stroke', 'url(#tcGrad)');
  link2.setAttribute('stroke-width', '4');
  link2.setAttribute('stroke-linecap', 'round');
  
  const link3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  link3.setAttribute('d', 'M -40 20 Q -40 10 -30 10 Q -20 10 -20 20 Q -20 30 -30 30 Q -40 30 -40 20 Z M 20 20 Q 20 10 30 10 Q 40 10 40 20 Q 40 30 30 30 Q 20 30 20 20 Z');
  link3.setAttribute('fill', 'none');
  link3.setAttribute('stroke', 'url(#tcGrad)');
  link3.setAttribute('stroke-width', '4');
  link3.setAttribute('stroke-linecap', 'round');
  
  // Checkmark
  const check = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  check.setAttribute('d', 'M -15 -5 L -5 5 L 15 -15');
  check.setAttribute('fill', 'none');
  check.setAttribute('stroke', '#10B981');
  check.setAttribute('stroke-width', '6');
  check.setAttribute('stroke-linecap', 'round');
  check.setAttribute('stroke-linejoin', 'round');
  
  g.appendChild(link1);
  g.appendChild(link2);
  g.appendChild(link3);
  g.appendChild(check);
  svg.appendChild(g);
  
  return svg;
}

function showHoverOverlay(element) {
  // Prevent multiple overlays from being created at the same time
  if (isCreatingOverlay) {
    return;
  }

  // Only show overlay on actual img or video elements
  if (element.tagName !== 'IMG' && element.tagName !== 'VIDEO') {
    return;
  }
  
  // Skip if element is inside a button or is a button itself
  if (element.closest('button') || element.tagName === 'BUTTON') {
    return;
  }
  
  // Skip if element is inside an anchor tag that looks like a button
  const parentLink = element.closest('a');
  if (parentLink && (
    parentLink.classList.contains('button') ||
    parentLink.classList.contains('btn') ||
    parentLink.getAttribute('role') === 'button'
  )) {
    return;
  }

  const mediaUrl = getMediaUrlFromElement(element);
  if (!mediaUrl) {
    console.log('No media URL found for element:', element.tagName, element);
    return;
  }

  // Check if element is visible before showing overlay
  const rect = element.getBoundingClientRect();
  const isVisible = rect.width > 0 && rect.height > 0 &&
    rect.top >= -100 && rect.left >= -100 &&
    rect.bottom <= window.innerHeight + 100 &&
    rect.right <= window.innerWidth + 100;
  
  if (!isVisible) {
    return; // Don't show overlay if element is out of view
  }

  // Hide any existing overlay first
  if (currentActiveOverlayUrl && currentActiveOverlayUrl !== mediaUrl) {
    const existingOverlayData = hoverOverlays.get(currentActiveOverlayUrl);
    if (existingOverlayData && existingOverlayData.overlay) {
      existingOverlayData.overlay.style.opacity = '0';
      existingOverlayData.overlay.style.pointerEvents = 'none';
      if (existingOverlayData.hideTimeout) {
        clearTimeout(existingOverlayData.hideTimeout);
        existingOverlayData.hideTimeout = null;
      }
    }
  }

  // Check if overlay already exists for this media
  let overlayData = hoverOverlays.get(mediaUrl);
  if (overlayData && overlayData.overlay && overlayData.overlay.parentElement) {
    // Overlay already exists, just update its position and show it
    overlayData.overlay.style.opacity = '1';
    overlayData.overlay.style.pointerEvents = 'auto';
    updateBadgePosition(overlayData.overlay, element, mediaUrl);
    if (overlayData.hideTimeout) {
      clearTimeout(overlayData.hideTimeout);
      overlayData.hideTimeout = null;
    }
    currentActiveOverlayUrl = mediaUrl;
    return;
  }

  // Set flag to prevent concurrent creation
  isCreatingOverlay = true;
  
  if (!overlayData) {
    const overlay = document.createElement('div');
    overlay.className = 'truthchain-hover-overlay';
    overlay.tabIndex = 0;
    
    // Add TruthChain-themed button with logo and dropdown
    const saveButton = document.createElement('div');
    saveButton.className = 'truthchain-save-button';
    
    const saveIcon = document.createElement('img');
    saveIcon.src = getLogoUrl('truthchain-icon-white.png');
    saveIcon.alt = 'TruthChain';
    saveIcon.className = 'truthchain-save-icon';
    saveIcon.style.cssText = 'width: 24px; height: 24px; display: inline-block; object-fit: contain;';
    saveIcon.onerror = function() {
      console.error('Save button icon failed to load, trying blue icon');
      this.src = getLogoUrl('truthchain-icon-blue.png');
      this.style.filter = 'brightness(0) invert(1)';
    };
    saveIcon.onload = function() {
      console.log('Save button icon loaded successfully');
    };
    
    const arrow = document.createElement('span');
    arrow.className = 'truthchain-dropdown-arrow';
    arrow.textContent = '▼';
    
    saveButton.appendChild(saveIcon);
    saveButton.appendChild(arrow);
    overlay.appendChild(saveButton);
    
    // Create dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'truthchain-overlay-dropdown';
    
    const status = mediaStatus.get(mediaUrl);
    const isVerified = status && status.status === 'verified';
    
    const verifyOption = document.createElement('div');
    verifyOption.className = 'truthchain-dropdown-option';
    verifyOption.innerHTML = '<span class="truthchain-dropdown-icon">✓</span><span>Verify Authenticity</span>';
    verifyOption.addEventListener('click', (e) => {
      e.stopPropagation();
      verifyMedia(mediaUrl);
      openSidebar(mediaUrl);
    });
    
    const registerOption = document.createElement('div');
    registerOption.className = 'truthchain-dropdown-option';
    registerOption.innerHTML = '<span class="truthchain-dropdown-icon">+</span><span>Register on TruthChain</span>';
    registerOption.addEventListener('click', (e) => {
      e.stopPropagation();
      registerMedia(mediaUrl, { showBadge: false });
      openSidebar(mediaUrl);
    });
    
    dropdown.appendChild(verifyOption);
    if (!isVerified) {
      dropdown.appendChild(registerOption);
    }
    
    overlay.appendChild(dropdown);
    
    // Create overlayData first so event handlers can use it
    const cleanup = attachResponsiveBadgeListeners(overlay, element, mediaUrl);
    overlayData = {
      overlay,
      dropdown,
      cleanup,
      hideTimeout: null,
      dropdownHoverTimeout: null
    };
    hoverOverlays.set(mediaUrl, overlayData);
    
    // Show dropdown on hover - keep it open when hovering over dropdown too
    overlay.addEventListener('mouseenter', () => {
      if (overlayData.hideTimeout) {
        clearTimeout(overlayData.hideTimeout);
        overlayData.hideTimeout = null;
      }
      if (overlayData.dropdownHoverTimeout) {
        clearTimeout(overlayData.dropdownHoverTimeout);
        overlayData.dropdownHoverTimeout = null;
      }
      overlayData.dropdown.classList.add('truthchain-dropdown-visible');
    });
    
    overlay.addEventListener('mouseleave', (e) => {
      // Only hide if not moving to dropdown
      if (!overlayData.dropdown.contains(e.relatedTarget)) {
        overlayData.dropdownHoverTimeout = setTimeout(() => {
          overlayData.dropdown.classList.remove('truthchain-dropdown-visible');
          scheduleOverlayHide(mediaUrl);
        }, 150);
      }
    });
    
    // Keep dropdown open when hovering over it
    overlayData.dropdown.addEventListener('mouseenter', () => {
      if (overlayData.dropdownHoverTimeout) {
        clearTimeout(overlayData.dropdownHoverTimeout);
        overlayData.dropdownHoverTimeout = null;
      }
      overlayData.dropdown.classList.add('truthchain-dropdown-visible');
    });
    
    overlayData.dropdown.addEventListener('mouseleave', () => {
      overlayData.dropdown.classList.remove('truthchain-dropdown-visible');
      scheduleOverlayHide(mediaUrl);
    });
    
    // Click on overlay or button opens sidebar
    overlay.addEventListener('click', (e) => {
      // Don't open sidebar if clicking dropdown options
      if (e.target.closest('.truthchain-dropdown-option')) {
        return;
      }
      e.stopPropagation();
      openSidebar(mediaUrl);
    });
    
    document.body.appendChild(overlay);
    
    // Reset flag after overlay is created
    isCreatingOverlay = false;
    currentActiveOverlayUrl = mediaUrl;
  } else {
    // Reset flag if overlay already existed
    isCreatingOverlay = false;
  }

  // Update dropdown based on current status
  const status = mediaStatus.get(mediaUrl);
  const isVerified = status && status.status === 'verified';
  const registerOption = overlayData.dropdown.querySelector('.truthchain-dropdown-option:last-child');
  if (registerOption && registerOption.textContent.includes('Register')) {
    if (isVerified) {
      registerOption.style.display = 'none';
    } else {
      registerOption.style.display = 'flex';
    }
  }

  overlayData.overlay.style.opacity = '1';
  overlayData.overlay.style.pointerEvents = 'auto';
  updateBadgePosition(overlayData.overlay, element, mediaUrl);
  currentActiveOverlayUrl = mediaUrl;

  if (overlayData.hideTimeout) {
    clearTimeout(overlayData.hideTimeout);
    overlayData.hideTimeout = null;
  }
}

function scheduleOverlayHide(mediaUrl, delay = 200) {
  const overlayData = hoverOverlays.get(mediaUrl);
  if (!overlayData) return;
  if (overlayData.hideTimeout) {
    clearTimeout(overlayData.hideTimeout);
  }
  overlayData.hideTimeout = setTimeout(() => {
    overlayData.overlay.style.opacity = '0';
    overlayData.overlay.style.pointerEvents = 'none';
    // Clear active overlay URL when hiding
    if (currentActiveOverlayUrl === mediaUrl) {
      currentActiveOverlayUrl = null;
    }
  }, delay);
}

function hideHoverOverlay(elementOrUrl) {
  const mediaUrl = typeof elementOrUrl === 'string'
    ? elementOrUrl
    : getMediaUrlFromElement(elementOrUrl);
  if (!mediaUrl) return;
  scheduleOverlayHide(mediaUrl);
  // Immediately clear active overlay URL
  if (currentActiveOverlayUrl === mediaUrl) {
    currentActiveOverlayUrl = null;
  }
}

function updateOverlayStatus(mediaUrl) {
  const overlayData = hoverOverlays.get(mediaUrl);
  if (!overlayData) return;
  // Update dropdown based on new status
  const status = mediaStatus.get(mediaUrl);
  const isVerified = status && status.status === 'verified';
  const registerOption = overlayData.dropdown.querySelector('.truthchain-dropdown-option:last-child');
  if (registerOption && registerOption.textContent.includes('Register')) {
    if (isVerified) {
      registerOption.style.display = 'none';
    } else {
      registerOption.style.display = 'flex';
    }
  }
}

function ensureSidebarElements() {
  if (sidebarElement && sidebarBackdrop && sidebarContent) {
    return;
  }

  sidebarBackdrop = document.createElement('div');
  sidebarBackdrop.className = 'truthchain-sidebar-backdrop';
  sidebarBackdrop.addEventListener('click', closeSidebar);

  sidebarElement = document.createElement('div');
  sidebarElement.className = 'truthchain-sidebar';

  const header = document.createElement('div');
  header.className = 'truthchain-sidebar-header';

  const title = document.createElement('div');
  title.className = 'truthchain-sidebar-title';
  title.textContent = 'TruthChain Verification';

  const closeButton = document.createElement('button');
  closeButton.className = 'truthchain-sidebar-close';
  closeButton.setAttribute('aria-label', 'Close TruthChain panel');
  closeButton.textContent = '×';
  closeButton.addEventListener('click', closeSidebar);

  header.appendChild(title);
  header.appendChild(closeButton);

  sidebarContent = document.createElement('div');
  sidebarContent.className = 'truthchain-sidebar-body';

  sidebarElement.appendChild(header);
  sidebarElement.appendChild(sidebarContent);

  document.body.appendChild(sidebarBackdrop);
  document.body.appendChild(sidebarElement);
}

function openSidebar(mediaUrl) {
  ensureSidebarElements();
  sidebarActiveMediaUrl = mediaUrl;
  sidebarBackdrop.classList.add('truthchain-sidebar-visible');
  sidebarElement.classList.add('truthchain-sidebar-open');
  document.body.classList.add('truthchain-sidebar-active');

  renderSidebarState(mediaUrl, { state: 'loading' });

  const cachedStatus = mediaStatus.get(mediaUrl);
  if (cachedStatus) {
    renderSidebarState(mediaUrl, { state: 'result', result: cachedStatus });
  }

  verifyMedia(mediaUrl, false)
    .then((result) => {
      if (!result) return;
      mediaStatus.set(mediaUrl, result);
      updateOverlayStatus(mediaUrl);
      renderSidebarState(mediaUrl, { state: 'result', result });
    })
    .catch((error) => {
      renderSidebarState(mediaUrl, { state: 'error', message: error.message });
    });
}

function closeSidebar() {
  if (!sidebarElement || !sidebarBackdrop) return;
  sidebarElement.classList.remove('truthchain-sidebar-open');
  sidebarBackdrop.classList.remove('truthchain-sidebar-visible');
  document.body.classList.remove('truthchain-sidebar-active');
  sidebarActiveMediaUrl = null;
}

function renderSidebarState(mediaUrl, { state, result, message }) {
  if (!sidebarContent || sidebarActiveMediaUrl !== mediaUrl) return;
  sidebarContent.innerHTML = '';

  const sourceSection = document.createElement('div');
  sourceSection.className = 'truthchain-sidebar-source';
  sourceSection.textContent = mediaUrl;
  sidebarContent.appendChild(sourceSection);

  if (state === 'loading') {
    const loading = document.createElement('div');
    loading.className = 'truthchain-sidebar-status';
    loading.textContent = 'Verifying on Sui...';
    sidebarContent.appendChild(loading);
    return;
  }

  if (state === 'error') {
    const errorEl = document.createElement('div');
    errorEl.className = 'truthchain-sidebar-status error';
    errorEl.textContent = message || 'Verification failed. Please try again.';
    sidebarContent.appendChild(errorEl);
    const retryBtn = document.createElement('button');
    retryBtn.className = 'truthchain-sidebar-button primary';
    retryBtn.textContent = 'Retry Verification';
    retryBtn.addEventListener('click', () => openSidebar(mediaUrl));
    sidebarContent.appendChild(retryBtn);
    return;
  }

  if (state === 'registering') {
    const registeringEl = document.createElement('div');
    registeringEl.className = 'truthchain-sidebar-status';
    registeringEl.textContent = 'Registering attestation on Sui...';
    sidebarContent.appendChild(registeringEl);
    return;
  }

  if (state === 'registration-success') {
    const successPill = document.createElement('div');
    successPill.className = 'truthchain-sidebar-status-pill verified';
    successPill.textContent = '✓ Successfully Registered!';
    sidebarContent.appendChild(successPill);

    const successMessage = document.createElement('div');
    successMessage.className = 'truthchain-sidebar-status';
    successMessage.style.color = '#10B981';
    successMessage.style.marginTop = '12px';
    successMessage.textContent = 'Your media has been registered on Sui blockchain. Verifying...';
    sidebarContent.appendChild(successMessage);

    if (result) {
      const metaList = document.createElement('div');
      metaList.className = 'truthchain-sidebar-meta';
      metaList.style.marginTop = '16px';

      if (result.hash) {
        const hashRow = document.createElement('div');
        hashRow.className = 'truthchain-sidebar-meta-row';
        const hashLabel = document.createElement('span');
        hashLabel.textContent = 'Hash';
        const hashCode = document.createElement('code');
        hashCode.textContent = `${result.hash.slice(0, 12)}…${result.hash.slice(-8)}`;
        hashRow.appendChild(hashLabel);
        hashRow.appendChild(hashCode);
        metaList.appendChild(hashRow);
      }

      if (result.txDigest) {
        const txRow = document.createElement('div');
        txRow.className = 'truthchain-sidebar-meta-row';
        const txLabel = document.createElement('span');
        txLabel.textContent = 'Transaction';
        const codeEl = document.createElement('code');
        const txLink = document.createElement('a');
        txLink.href = `https://suiexplorer.com/txblock/${result.txDigest}?network=testnet`;
        txLink.target = '_blank';
        txLink.rel = 'noopener noreferrer';
        txLink.style.color = '#0EA5E9';
        txLink.style.textDecoration = 'none';
        txLink.textContent = `${result.txDigest.slice(0, 12)}…${result.txDigest.slice(-8)}`;
        txLink.addEventListener('mouseenter', () => {
          txLink.style.textDecoration = 'underline';
        });
        txLink.addEventListener('mouseleave', () => {
          txLink.style.textDecoration = 'none';
        });
        codeEl.appendChild(txLink);
        txRow.appendChild(txLabel);
        txRow.appendChild(codeEl);
        metaList.appendChild(txRow);
      }

      if (result.attestationId) {
        const attRow = document.createElement('div');
        attRow.className = 'truthchain-sidebar-meta-row';
        const attLabel = document.createElement('span');
        attLabel.textContent = 'Attestation ID';
        const attCode = document.createElement('code');
        attCode.textContent = `${result.attestationId.slice(0, 12)}…${result.attestationId.slice(-8)}`;
        attRow.appendChild(attLabel);
        attRow.appendChild(attCode);
        metaList.appendChild(attRow);
      }

      if (result.walrus_blob_id) {
        const walrusRow = document.createElement('div');
        walrusRow.className = 'truthchain-sidebar-meta-row';
        const walrusLabel = document.createElement('span');
        walrusLabel.textContent = 'Walrus Blob';
        const walrusCode = document.createElement('code');
        walrusCode.textContent = `${result.walrus_blob_id.slice(0, 10)}…`;
        walrusRow.appendChild(walrusLabel);
        walrusRow.appendChild(walrusCode);
        metaList.appendChild(walrusRow);
      }

      if (result.creator) {
        const creatorRow = document.createElement('div');
        creatorRow.className = 'truthchain-sidebar-meta-row';
        const creatorLabel = document.createElement('span');
        creatorLabel.textContent = 'Creator';
        const creatorCode = document.createElement('code');
        creatorCode.textContent = `${result.creator.slice(0, 10)}…${result.creator.slice(-6)}`;
        creatorRow.appendChild(creatorLabel);
        creatorRow.appendChild(creatorCode);
        metaList.appendChild(creatorRow);
      }

      sidebarContent.appendChild(metaList);
    }
    return;
  }

  if (!result) return;

  const statusPill = document.createElement('div');
  statusPill.className = `truthchain-sidebar-status-pill ${result.status}`;
  statusPill.textContent =
    result.status === 'verified' ? 'Verified on Sui' : 'No attestation found';
  sidebarContent.appendChild(statusPill);

  const metaList = document.createElement('div');
  metaList.className = 'truthchain-sidebar-meta';

  if (result.hash) {
    const hashRow = document.createElement('div');
    hashRow.className = 'truthchain-sidebar-meta-row';
    hashRow.innerHTML = `<span>Hash</span><code>${result.hash.slice(0, 12)}…${result.hash.slice(-8)}</code>`;
    metaList.appendChild(hashRow);
  }

  if (result.attestationId) {
    const attRow = document.createElement('div');
    attRow.className = 'truthchain-sidebar-meta-row';
    attRow.innerHTML = `<span>Attestation ID</span><code>${result.attestationId.slice(0, 12)}…${result.attestationId.slice(-8)}</code>`;
    metaList.appendChild(attRow);
  }

  if (result.walrus_blob_id) {
    const walrusRow = document.createElement('div');
    walrusRow.className = 'truthchain-sidebar-meta-row';
    walrusRow.innerHTML = `<span>Walrus Blob</span><code>${result.walrus_blob_id.slice(0, 10)}…</code>`;
    metaList.appendChild(walrusRow);
  }

  if (result.creator) {
    const creatorRow = document.createElement('div');
    creatorRow.className = 'truthchain-sidebar-meta-row';
    creatorRow.innerHTML = `<span>Creator</span><code>${result.creator.slice(0, 10)}…${result.creator.slice(-6)}</code>`;
    metaList.appendChild(creatorRow);
  }

  sidebarContent.appendChild(metaList);

  if (result.status === 'unknown') {
    const actions = document.createElement('div');
    actions.className = 'truthchain-sidebar-actions';

    const registerBtn = document.createElement('button');
    registerBtn.className = 'truthchain-sidebar-button primary';
    registerBtn.textContent = 'Register on TruthChain';
    registerBtn.addEventListener('click', () => registerMediaFromSidebar(mediaUrl));

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'truthchain-sidebar-button';
    dismissBtn.textContent = 'Close';
    dismissBtn.addEventListener('click', closeSidebar);

    actions.appendChild(registerBtn);
    actions.appendChild(dismissBtn);
    sidebarContent.appendChild(actions);
  } else {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'truthchain-sidebar-button primary';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeSidebar);
    sidebarContent.appendChild(closeBtn);
  }
}

async function registerMediaFromSidebar(mediaUrl) {
  if (!sidebarActiveMediaUrl || sidebarActiveMediaUrl !== mediaUrl) return;
  renderSidebarState(mediaUrl, { state: 'registering' });
  try {
    const registrationResult = await registerMedia(mediaUrl, { showBadge: false });
    
    // Show success message with registration details
    if (registrationResult && registrationResult.success) {
      renderSidebarState(mediaUrl, { 
        state: 'registration-success', 
        result: registrationResult 
      });
      
      // After a short delay, verify and update to show verified status
      setTimeout(async () => {
        const verifyResult = await verifyMedia(mediaUrl, false);
        if (verifyResult) {
          mediaStatus.set(mediaUrl, verifyResult);
          updateOverlayStatus(mediaUrl);
          renderSidebarState(mediaUrl, { state: 'result', result: verifyResult });
        }
      }, 1000);
    } else {
      // If registration didn't return success, try to verify anyway
      const verifyResult = await verifyMedia(mediaUrl, false);
      if (verifyResult && verifyResult.status === 'verified') {
        mediaStatus.set(mediaUrl, verifyResult);
        updateOverlayStatus(mediaUrl);
        renderSidebarState(mediaUrl, { state: 'result', result: verifyResult });
      } else {
        renderSidebarState(mediaUrl, {
          state: 'error',
          message: registrationResult?.error || 'Registration completed but verification unavailable. Please try again.'
        });
      }
    }
  } catch (error) {
    console.error('Sidebar registration error:', error);
    renderSidebarState(mediaUrl, {
      state: 'error',
      message: error.message || 'Registration failed'
    });
  }
}

function updateSidebarWithResult(mediaUrl, result) {
  if (!sidebarActiveMediaUrl || sidebarActiveMediaUrl !== mediaUrl) return;
  if (result instanceof Error) {
    renderSidebarState(mediaUrl, { state: 'error', message: result.message });
    return;
  }
  renderSidebarState(mediaUrl, { state: 'result', result });
}

  
  // Helper function to get logo URL
  function getLogoUrl(logoName = 'truthchain-icon-blue.png') {
    // Check if runtime is available first
    if (!ensureRuntimeAvailable()) {
      // Return a data URI placeholder if extension context is invalid
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDE5IDhsLTkgOXoiIGZpbGw9IiMxMEI5ODEiLz48L3N2Zz4=';
    }
    
    try {
      const url = chrome.runtime.getURL(`icons/${logoName}`);
      console.log('Getting logo URL:', url);
      return url;
    } catch (error) {
      // If getURL throws, return fallback (shouldn't happen if ensureRuntimeAvailable passed)
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDE5IDhsLTkgOXoiIGZpbGw9IiMxMEI5ODEiLz48L3N2Zz4=';
    }
  }
  
  // Alternative: Load image as blob (more reliable in some cases)
  async function loadImageAsBlob(logoName) {
    try {
      const url = getLogoUrl(logoName);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      console.log('✅ Image loaded as blob:', blobUrl);
      return blobUrl;
    } catch (error) {
      console.error('❌ Failed to load image as blob:', error);
      return null;
    }
  }

  function showVerificationBadge(mediaUrl, result) {
    const element = findMediaByUrl(mediaUrl);
    if (!element) {
      // Don't show warning for every failed lookup - some images may be dynamically loaded
      // Just return silently
      return;
    }
  
    // Remove existing badge for this specific image
    removeBadgeForImage(mediaUrl);
  
    const badge = document.createElement('div');
    badge.className = 'truthchain-badge result';
    badge.id = 'truthchain-badge-' + Date.now();
    badge.setAttribute('data-media-url', mediaUrl); // Track which media this badge belongs to
    
    let backgroundColor = '#6B7280'; // default
    // Use blue icon for better visibility on all colored backgrounds
    let logoUrl = getLogoUrl('truthchain-icon-blue.png');
    let badgeText = '';
    
    if (result.status === 'verified') {
      badgeText = 'Verified';
      backgroundColor = '#10B981';
      // Blue icon works well on green background
      logoUrl = getLogoUrl('truthchain-icon-blue.png');
    } else if (result.status === 'unknown') {
      badgeText = 'Unknown (Click to Register)';
      backgroundColor = '#6B7280';
      // Blue icon works well on gray background
      logoUrl = getLogoUrl('truthchain-icon-blue.png');
      // Add click handler to register
      badge.addEventListener('click', () => {
        console.log('Unknown badge clicked, registering image...');
        registerMedia(mediaUrl);
      });
      badge.title = 'Click to register this image';
      badge.style.cursor = 'pointer';
    } else {
      badgeText = 'Error';
      backgroundColor = '#EF4444';
      // Blue icon works well on red background
      logoUrl = getLogoUrl('truthchain-icon-blue.png');
    }
  
    // Create logo image element - use blob loading for reliability
    const logoImg = document.createElement('img');
    logoImg.alt = 'TruthChain';
    logoImg.setAttribute('data-logo-url', logoUrl);
    
    // Set styles
    logoImg.style.cssText = `
      width: 20px !important;
      height: 20px !important;
      min-width: 20px !important;
      min-height: 20px !important;
      margin-right: 8px !important;
      vertical-align: middle !important;
      display: inline-block !important;
      object-fit: contain !important;
      background: transparent !important;
      opacity: 1 !important;
      visibility: visible !important;
      flex-shrink: 0 !important;
      border: none !important;
    `;
    
    // Try to load image as blob first, fallback to direct URL
    (async () => {
      try {
        const blobUrl = await loadImageAsBlob('truthchain-icon-blue.png');
        if (blobUrl) {
          logoImg.src = blobUrl;
        } else {
          logoImg.src = logoUrl;
        }
      } catch (e) {
        logoImg.src = logoUrl;
      }
    })();
    
    logoImg.onerror = function() {
      console.error('❌ Badge logo failed to load, trying direct URL');
      // Try direct URL as fallback
      this.src = getLogoUrl('truthchain-icon-blue.png');
      this.onerror = function() {
        console.error('❌ Badge logo completely failed to load');
        // Use emoji fallback
        const fallback = document.createElement('span');
        fallback.textContent = '🔗';
        fallback.style.cssText = 'margin-right: 8px; font-size: 18px; display: inline-block; color: white;';
        if (this.parentNode) {
          this.parentNode.replaceChild(fallback, this);
        }
      };
    };
    
    logoImg.onload = function() {
      console.log('✅ Badge logo loaded successfully');
    };
  
    // Create badge with logo and text
    const textSpan = document.createElement('span');
    textSpan.textContent = badgeText;
    
    // Add logo to badge
    badge.appendChild(logoImg);
    badge.appendChild(textSpan);
  
    // Debug logging
    console.log('Creating badge with background:', backgroundColor, 'for status:', result.status);
    
    // Use fixed positioning with responsive updates (will switch to absolute in fullscreen)
    badge.style.cssText = `
      position: fixed !important;
      background: ${backgroundColor} !important;
      color: white !important;
      padding: 8px 12px !important;
      border-radius: 6px !important;
      font-size: 13px !important;
      font-weight: bold !important;
      z-index: 999999 !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
      pointer-events: auto !important;
      white-space: nowrap !important;
      display: flex !important;
      align-items: center !important;
      border: none !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;
  
    // Set initial position (will handle fullscreen automatically)
    updateBadgePosition(badge, element, mediaUrl);
    
    const cleanup = attachResponsiveBadgeListeners(badge, element, mediaUrl);
    
    // Store badge data for this media
    mediaBadges.set(mediaUrl, {
      badge,
      element,
      cleanup
    });
  
    // Double-check we don't already have a badge for this media
    const existingBadges = document.querySelectorAll(`[data-media-url="${mediaUrl}"]`);
    existingBadges.forEach(existingBadge => {
      if (existingBadge !== badge && existingBadge.parentElement) {
        console.warn('Removing duplicate badge for:', mediaUrl);
        existingBadge.parentElement.removeChild(existingBadge);
      }
    });
  
    document.body.appendChild(badge);
    console.log('Verification badge added with responsive positioning for image:', mediaUrl);
  }
  
async function registerMedia(mediaUrl, options = {}) {
  const { showBadge = true } = options;
    // Prevent duplicate registrations
    if (verifyingUrls.has(mediaUrl)) {
      console.log('Already processing this media, skipping:', mediaUrl);
      return;
    }
    
    try {
    verifyingUrls.add(mediaUrl);
    // Loading badges are now hover-based, not shown immediately
  
      // Try to fetch the media - handle CORS issues
      let response;
      try {
        response = await fetch(mediaUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (fetchError) {
        // If direct fetch fails (CORS), use backend proxy
        console.warn('Direct fetch failed, trying backend proxy:', fetchError);
        try {
          const proxyUrl = `https://truthchain-drow.onrender.com/v1/proxy?url=${encodeURIComponent(mediaUrl)}`;
          response = await fetch(proxyUrl);
          if (!response.ok) {
            throw new Error(`Proxy fetch failed: HTTP ${response.status}`);
          }
          console.log('Successfully fetched via proxy for registration');
        } catch (proxyError) {
          console.error('Proxy fetch also failed:', proxyError);
          throw new Error(`Cannot fetch image due to CORS restrictions. Please ensure the image is accessible.`);
        }
      }
      
      const blob = await response.blob();
      console.log('Image fetched for registration, calculating hash...');
      const hash = await calculateHash(blob);
      console.log('Hash calculated for registration:', hash);
  
      // Get metadata from the media
      const isVideo = blob.type.startsWith('video/');
      const metadata = {
        source: new URL(mediaUrl).hostname,
        mediaType: isVideo ? 'video' : 'photo',
        isAiGenerated: false,
        url: mediaUrl
      };
  
      console.log('Sending hash to background script for registration...');
      const result = await sendMessageToBackground({
        action: 'register-hash',
        hash,
        metadata
      });
  
    if (result.success) {
      // Store status - badge will show on hover
      mediaStatus.set(mediaUrl, { status: 'verified', ...result });
      // Mark as verified so it won't be auto-verified again
      verifiedMediaUrls.add(mediaUrl);
      // Allow auto-verification to run again to show updated state
      processedAutoHashes.delete(hash);
      verifiedHashes.delete(hash);
      
      // Return the result so sidebar can display it
      return result;
    } else {
      // Store error status - badge will show on hover if needed
      mediaStatus.set(mediaUrl, { status: 'error', message: result.error || 'Registration failed' });
    }
    
    return result;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isContextInvalidated = errorMsg.includes('Extension context invalidated') || 
                                    errorMsg.includes('message port closed') ||
                                    errorMsg.includes('Receiving end does not exist');
      
      if (isContextInvalidated) {
        console.warn('Extension context invalidated during registration. The extension may have been reloaded.');
        // Don't store error status for context invalidation - just log it
        // The user will need to reload the page to continue
        updateSidebarWithResult(mediaUrl, {
          status: 'error',
          message: 'Extension context invalidated. Please reload the page to continue.'
        });
        // Don't throw - just return null to indicate failure
        return null;
      }
      
      console.error('Registration error:', error);
      // Store error status - badge will show on hover if needed
      mediaStatus.set(mediaUrl, {
        status: 'error',
        message: errorMsg
      });
      updateOverlayStatus(mediaUrl);
      updateSidebarWithResult(mediaUrl, error);
      throw error; // Re-throw non-context-invalidation errors
    } finally {
      verifyingUrls.delete(mediaUrl);
    }
  }

  function updateBadgePosition(badge, element, mediaUrl) {
    // Check if element still exists in DOM
    if (!element || (!document.contains(element) && !element.isConnected)) {
      // Try to re-find the element
      const foundElement = findMediaByUrl(mediaUrl);
      if (!foundElement) {
        console.log('Media element not found, removing badge for:', mediaUrl);
        removeBadgeForImage(mediaUrl);
        // Also remove hover overlay if it exists
        const overlayData = hoverOverlays.get(mediaUrl);
        if (overlayData) {
          if (overlayData.cleanup) overlayData.cleanup();
          if (overlayData.overlay?.parentElement) {
            overlayData.overlay.parentElement.removeChild(overlayData.overlay);
          }
          hoverOverlays.delete(mediaUrl);
        }
        return;
      }
      // Update element reference
      element = foundElement;
    }
    
    // Check if we're in fullscreen mode
    const fullscreenElement = document.fullscreenElement || 
                              document.webkitFullscreenElement || 
                              document.mozFullScreenElement || 
                              document.msFullscreenElement;
    
    // Ensure badge is in the DOM so we can measure it
    const targetContainer = document.body || document.documentElement;
    if (badge.parentElement !== targetContainer) {
      targetContainer.appendChild(badge);
    }

    const elementRect = element.getBoundingClientRect();
    
    // Check if element is visible - be very lenient for large images
    const isHoverOverlay = badge.classList.contains('truthchain-hover-overlay');
    
    // Basic check: element must have dimensions
    if (elementRect.width === 0 || elementRect.height === 0) {
      badge.style.display = 'none';
      if (isHoverOverlay) {
        badge.style.opacity = '0';
        badge.style.pointerEvents = 'none';
      }
      return;
    }
    
    // For large images that cover most of the screen, always show badge
    // Check if image intersects with viewport at all (very lenient)
    const intersectsViewport = 
      elementRect.right > 0 && 
      elementRect.left < window.innerWidth &&
      elementRect.bottom > 0 && 
      elementRect.top < window.innerHeight;
    
    // If image doesn't intersect viewport at all, hide badge
    if (!intersectsViewport) {
      badge.style.display = 'none';
      if (isHoverOverlay) {
        badge.style.opacity = '0';
        badge.style.pointerEvents = 'none';
      }
      return;
    }
    
    // Ensure badge is visible
    badge.style.display = 'flex'; // Keep flex for proper layout
    badge.style.visibility = 'visible';
    badge.style.opacity = '1';
    badge.style.zIndex = '999999';
    badge.style.position = 'fixed';
    
    // Get badge dimensions - force a layout calculation if needed
    const badgeRect = badge.getBoundingClientRect();
    let badgeWidth = badgeRect.width;
    let badgeHeight = badgeRect.height;
    
    // If badge hasn't been measured yet, use defaults and measure after positioning
    if (badgeWidth === 0 || badgeHeight === 0) {
      badgeWidth = isHoverOverlay ? 80 : 120;
      badgeHeight = isHoverOverlay ? 28 : 35;
      // Force layout to get actual dimensions
      badge.style.visibility = 'hidden';
      badge.style.display = 'flex';
      const measuredRect = badge.getBoundingClientRect();
      if (measuredRect.width > 0) badgeWidth = measuredRect.width;
      if (measuredRect.height > 0) badgeHeight = measuredRect.height;
      badge.style.visibility = 'visible';
    }
    
    // Padding from image edges (Pinterest-style: 12px from top, 12px from right)
    const padding = isHoverOverlay ? 12 : 8;
    
    // Calculate visible intersection of image and viewport
    const visibleTop = Math.max(0, elementRect.top);
    const visibleRight = Math.min(window.innerWidth, elementRect.right);
    const visibleBottom = Math.min(window.innerHeight, elementRect.bottom);
    const visibleLeft = Math.max(0, elementRect.left);
    
    // For large images that cover most of the screen, position badge in viewport top-right
    // For smaller images, position relative to image top-right
    // Always ensure badge is visible in viewport
    
    // Check if image is very large (covers significant portion of viewport)
    const imageCoversLargeArea = 
      (elementRect.width > window.innerWidth * 0.8) || 
      (elementRect.height > window.innerHeight * 0.8);
    
    let top, left;
    
    if (imageCoversLargeArea) {
      // For large images: position in viewport top-right (always visible)
      top = padding;
      left = window.innerWidth - badgeWidth - padding;
    } else {
      // For normal images: position in visible image area top-right
      top = visibleTop + padding;
      left = visibleRight - badgeWidth - padding;
      
      // Ensure badge stays within visible image bounds
      if (top + badgeHeight > visibleBottom) {
        top = Math.max(padding, visibleBottom - badgeHeight - padding);
      }
      if (left < visibleLeft) {
        left = visibleLeft + padding;
      }
    }
    
    // Always ensure badge is within viewport bounds (critical)
    const viewportMaxTop = window.innerHeight - badgeHeight - padding;
    const viewportMaxLeft = window.innerWidth - badgeWidth - padding;
    top = Math.max(padding, Math.min(top, viewportMaxTop));
    left = Math.max(padding, Math.min(left, viewportMaxLeft));
    
    // Final visibility check - ensure badge is actually visible
    badge.style.top = `${top}px`;
    badge.style.left = `${left}px`;
    badge.style.display = 'flex';
    badge.style.visibility = 'visible';
    badge.style.opacity = '1';
    badge.style.pointerEvents = 'auto';

    // Always set position to ensure badge is visible
    badge.style.top = `${top}px`;
    badge.style.left = `${left}px`;
    badge.style.right = 'auto';
    badge.style.bottom = 'auto';
    
    // Force a reflow to ensure the badge is rendered
    void badge.offsetHeight;
  }

  function attachResponsiveBadgeListeners(badge, element, mediaUrl) {
    const badgeState = {
      rafId: null,
      scrollTimeout: null
    };

    const scheduleUpdate = () => {
      if (badgeState.rafId) cancelAnimationFrame(badgeState.rafId);
      badgeState.rafId = requestAnimationFrame(() => {
        const currentElement = findMediaByUrl(mediaUrl) || element;
        if (currentElement) {
          updateBadgePosition(badge, currentElement, mediaUrl);
        }
      });
    };

    const throttledScroll = () => {
      if (badgeState.scrollTimeout) return;
      badgeState.scrollTimeout = setTimeout(() => {
        scheduleUpdate();
        badgeState.scrollTimeout = null;
      }, 16);
    };

    window.addEventListener('scroll', throttledScroll, true);
    window.addEventListener('resize', scheduleUpdate);

    const fullscreenHandler = () => {
      setTimeout(scheduleUpdate, 100);
    };

    document.addEventListener('fullscreenchange', fullscreenHandler);
    document.addEventListener('webkitfullscreenchange', fullscreenHandler);
    document.addEventListener('mozfullscreenchange', fullscreenHandler);
    document.addEventListener('MSFullscreenChange', fullscreenHandler);

    scheduleUpdate();

    return () => {
      if (badgeState.rafId) cancelAnimationFrame(badgeState.rafId);
      if (badgeState.scrollTimeout) clearTimeout(badgeState.scrollTimeout);
      window.removeEventListener('scroll', throttledScroll, true);
      window.removeEventListener('resize', scheduleUpdate);
      document.removeEventListener('fullscreenchange', fullscreenHandler);
      document.removeEventListener('webkitfullscreenchange', fullscreenHandler);
      document.removeEventListener('mozfullscreenchange', fullscreenHandler);
      document.removeEventListener('MSFullscreenChange', fullscreenHandler);
    };
  }

  function removeBadgeForImage(mediaUrl) {
    // Remove tracked badge
    const badgeData = mediaBadges.get(mediaUrl);
    if (badgeData) {
      if (badgeData.cleanup) {
        badgeData.cleanup();
      }
      if (badgeData.badge) {
        // Hide immediately with display: none
        badgeData.badge.style.display = 'none';
        badgeData.badge.style.visibility = 'hidden';
        badgeData.badge.style.opacity = '0';
        // Then remove from DOM
        if (badgeData.badge.parentElement) {
          badgeData.badge.parentElement.removeChild(badgeData.badge);
        }
      }
      mediaBadges.delete(mediaUrl);
    }
    
    // Also remove any orphaned badges with matching data attribute
    // This handles cases where badges weren't properly tracked
    const allBadges = document.querySelectorAll('.truthchain-badge');
    allBadges.forEach(badge => {
      const badgeMediaUrl = badge.getAttribute('data-media-url');
      if (badgeMediaUrl === mediaUrl) {
        // Hide immediately
        badge.style.display = 'none';
        badge.style.visibility = 'hidden';
        badge.style.opacity = '0';
        // Then remove from DOM
        if (badge.parentElement) {
          badge.parentElement.removeChild(badge);
        }
      }
    });
  }

  function showLoadingBadge(mediaUrl, text = 'Verifying...') {
    const element = findMediaByUrl(mediaUrl);
    if (!element) {
      // Media element not found - may be dynamically loaded or removed
      return;
    }
  
    // Remove existing badge for this specific image
    removeBadgeForImage(mediaUrl);
  
    const badge = document.createElement('div');
    badge.className = 'truthchain-badge loading';
    badge.id = 'truthchain-badge-' + Date.now();
    badge.setAttribute('data-media-url', mediaUrl);
    const logoUrl = getLogoUrl('truthchain-icon-blue.png');
    
    // Create logo image element with error handling
    const logoImg = document.createElement('img');
    logoImg.src = logoUrl;
    logoImg.alt = 'TruthChain';
    logoImg.setAttribute('data-logo-url', logoUrl);
    logoImg.style.cssText = `
      width: 20px !important;
      height: 20px !important;
      min-width: 20px !important;
      min-height: 20px !important;
      margin-right: 8px !important;
      vertical-align: middle !important;
      display: inline-block !important;
      object-fit: contain !important;
      background: transparent !important;
      opacity: 1 !important;
      visibility: visible !important;
      flex-shrink: 0 !important;
      border: none !important;
    `;
    logoImg.onerror = function() {
      console.error('❌ Failed to load logo image:', logoUrl);
      // Try white as fallback
      this.src = getLogoUrl('truthchain-icon-white.png');
    };
    logoImg.onload = function() {
      console.log('✅ Loading badge logo loaded:', logoUrl);
    };
    
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    badge.appendChild(logoImg);
    badge.appendChild(textSpan);
    
    // Use fixed positioning with responsive updates (will switch to absolute in fullscreen)
    badge.style.cssText = `
      position: fixed;
      background: #1F2937;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      z-index: 999999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: auto;
      white-space: nowrap;
      display: flex;
      align-items: center;
    `;
  
    // Set initial position (will handle fullscreen automatically)
    updateBadgePosition(badge, element, mediaUrl);
    
    const cleanup = attachResponsiveBadgeListeners(badge, element, mediaUrl);
    
    // Store badge data for this media
    mediaBadges.set(mediaUrl, {
      badge,
      element,
      cleanup
    });
  
    // Double-check we don't already have a badge for this media
    const existingBadges = document.querySelectorAll(`[data-media-url="${mediaUrl}"]`);
    existingBadges.forEach(existingBadge => {
      if (existingBadge !== badge && existingBadge.parentElement) {
        console.warn('Removing duplicate badge for:', mediaUrl);
        existingBadge.parentElement.removeChild(existingBadge);
      }
    });
  
    document.body.appendChild(badge);
    console.log('Badge added with responsive positioning for image:', mediaUrl);
  }

  function showRegistrationBadge(mediaUrl, result) {
    const element = findMediaByUrl(mediaUrl);
    if (!element) {
      // Media element not found - may be dynamically loaded or removed
      return;
    }
  
    // Remove existing badge for this specific image
    removeBadgeForImage(mediaUrl);
  
    const badge = document.createElement('div');
    badge.className = 'truthchain-badge registered';
    badge.id = 'truthchain-badge-' + Date.now();
    badge.setAttribute('data-media-url', mediaUrl);
    const logoUrl = getLogoUrl('truthchain-icon-blue.png');
    
    // Create logo image element with error handling
    const logoImg = document.createElement('img');
    logoImg.src = logoUrl;
    logoImg.alt = 'TruthChain';
    logoImg.setAttribute('data-logo-url', logoUrl);
    logoImg.style.cssText = `
      width: 20px !important;
      height: 20px !important;
      min-width: 20px !important;
      min-height: 20px !important;
      margin-right: 8px !important;
      vertical-align: middle !important;
      display: inline-block !important;
      object-fit: contain !important;
      background: transparent !important;
      opacity: 1 !important;
      visibility: visible !important;
      flex-shrink: 0 !important;
      border: none !important;
    `;
    logoImg.onerror = function() {
      console.error('❌ Failed to load logo image:', logoUrl);
      this.src = getLogoUrl('truthchain-icon-white.png');
    };
    logoImg.onload = function() {
      console.log('✅ Registration badge logo loaded:', logoUrl);
    };
    
    const textSpan = document.createElement('span');
    textSpan.textContent = 'Registered';
    badge.appendChild(logoImg);
    badge.appendChild(textSpan);
    
    // Use fixed positioning with responsive updates (will switch to absolute in fullscreen)
    badge.style.cssText = `
      position: fixed;
      background: #10B981;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: auto;
      white-space: nowrap;
      display: flex;
      align-items: center;
    `;
  
    // Set initial position (will handle fullscreen automatically)
    updateBadgePosition(badge, element, mediaUrl);
    
    const cleanup = attachResponsiveBadgeListeners(badge, element, mediaUrl);
    
    // Store badge data for this media
    mediaBadges.set(mediaUrl, {
      badge,
      element,
      cleanup
    });
  
    document.body.appendChild(badge);
    console.log('Registration badge added with responsive positioning for image:', mediaUrl);
  }
  
  function showErrorBadge(mediaUrl, message) {
    const element = findMediaByUrl(mediaUrl);
    if (!element) {
      // Media element not found - may be dynamically loaded or removed
      return;
    }
  
    // Remove existing badge for this specific image
    removeBadgeForImage(mediaUrl);
  
    const badge = document.createElement('div');
    badge.className = 'truthchain-badge error';
    badge.id = 'truthchain-badge-' + Date.now();
    badge.setAttribute('data-media-url', mediaUrl);
    const logoUrl = getLogoUrl('truthchain-icon-blue.png');
    
    // Create logo image element with error handling
    const logoImg = document.createElement('img');
    logoImg.src = logoUrl;
    logoImg.alt = 'TruthChain';
    logoImg.setAttribute('data-logo-url', logoUrl);
    logoImg.style.cssText = `
      width: 20px !important;
      height: 20px !important;
      min-width: 20px !important;
      min-height: 20px !important;
      margin-right: 8px !important;
      vertical-align: middle !important;
      display: inline-block !important;
      object-fit: contain !important;
      background: transparent !important;
      opacity: 1 !important;
      visibility: visible !important;
      flex-shrink: 0 !important;
      border: none !important;
    `;
    logoImg.onerror = function() {
      console.error('❌ Failed to load logo image:', logoUrl);
      this.src = getLogoUrl('truthchain-icon-white.png');
    };
    logoImg.onload = function() {
      console.log('✅ Error badge logo loaded:', logoUrl);
    };
    
    const textSpan = document.createElement('span');
    textSpan.textContent = message || 'Error';
    badge.appendChild(logoImg);
    badge.appendChild(textSpan);
    
    // Use fixed positioning with responsive updates (will switch to absolute in fullscreen)
    badge.style.cssText = `
      position: fixed;
      background: #EF4444;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: auto;
      max-width: 250px;
      word-wrap: break-word;
      display: flex;
      align-items: center;
    `;
  
    // Set initial position (will handle fullscreen automatically)
    updateBadgePosition(badge, element, mediaUrl);
    
    const cleanup = attachResponsiveBadgeListeners(badge, element, mediaUrl);
    
    // Store badge data for this media
    mediaBadges.set(mediaUrl, {
      badge,
      element,
      cleanup
    });
  
document.body.appendChild(badge);
console.log('Error badge added with responsive positioning for image:', mediaUrl);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeMediaHoverSystem();
  });
} else {
  initializeMediaHoverSystem();
  }