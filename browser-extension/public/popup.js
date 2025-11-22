// Popup script for TruthChain extension
document.addEventListener('DOMContentLoaded', async () => {
  const contentDiv = document.getElementById('content');
  
  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      // Check if there are any images or videos on the page
      const hasMedia = await chrome.tabs.sendMessage(tab.id, { action: 'check-media' })
        .catch(() => null);
      
      if (hasMedia) {
        contentDiv.innerHTML = `
          <div class="instruction">
            <p>✅ Media detected on this page</p>
            <p style="margin-top: 15px; font-size: 14px;">
              Right-click any image or video and select<br>
              <strong>"Verify with TruthChain"</strong>
            </p>
          </div>
        `;
      } else {
        contentDiv.innerHTML = `
          <div class="instruction">
            <p>No media detected on this page</p>
            <p style="margin-top: 15px; font-size: 14px;">
              Navigate to a page with images or videos,<br>
              then right-click and select<br>
              <strong>"Verify with TruthChain"</strong>
            </p>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Error in popup:', error);
    // Keep default instruction message
  }
});

