# TruthChain Browser Extension

Browser extension for instant media verification on any website.

## Installation

### Method 1: Direct Download (Recommended)

1. **Download the extension:**
   - Go to the [TruthChain GitHub repository](https://github.com/Osiyomeoh/TruthChain)
   - Click the green "Code" button → "Download ZIP"
   - Extract the ZIP file

2. **Load in Chrome/Edge:**
   - Open Chrome and navigate to `chrome://extensions/` (or `edge://extensions/` for Edge)
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `browser-extension` folder from the extracted ZIP

3. **Verify installation:**
   - The TruthChain icon should appear in your browser toolbar
   - Visit any website with images to see verification badges

### Method 2: Clone Repository

```bash
git clone https://github.com/Osiyomeoh/TruthChain.git
cd TruthChain/browser-extension
```

Then follow steps 2-3 from Method 1.

## Features

- **Auto-Verification**: Automatically verifies images and videos as you browse
- **Right-Click Menu**: Right-click any media to verify or register
- **Social Media Support**: Works on Twitter, Instagram, Facebook, TikTok, LinkedIn, and more
- **Visual Badges**: See verification status instantly with colored badges
- **Blockchain Integration**: All verifications stored on Sui blockchain

## Usage

### Verify Media

1. **Automatic**: Badges appear automatically on verified media
2. **Manual**: Right-click any image/video → "Verify with TruthChain"

### Register Media

1. Right-click any image/video → "Register with TruthChain"
2. The media will be registered on Sui blockchain
3. A badge will appear showing registration status

## Configuration

The extension connects to the backend API at:
- **Production**: `https://truthchain-drow.onrender.com`
- **Development**: `http://localhost:3000`

To change the API URL, edit `src/background.js`:
```javascript
const API_BASE = 'https://your-backend-url.com/v1';
```

## Development

### File Structure

```
browser-extension/
├── manifest.json          # Extension manifest (Manifest V3)
├── src/
│   ├── background.js      # Service worker (API calls)
│   ├── content.js         # Content script (media detection)
│   └── content.css        # Styles for badges/overlays
├── public/
│   └── popup.html         # Extension popup UI
├── icons/                 # Extension icons
└── logo/                  # Logo files
```

### Building

No build step required! The extension uses vanilla JavaScript.

### Testing

1. Load the extension in Chrome (see Installation)
2. Visit a website with images (e.g., Unsplash, Twitter)
3. Check browser console for debug logs
4. Test right-click menu options

## Troubleshooting

### Extension not loading

- Ensure "Developer mode" is enabled
- Check that you selected the correct `browser-extension` folder (not the parent folder)
- Check browser console for errors

### Badges not appearing

- Check that the backend API is running
- Verify API URL in `src/background.js`
- Check browser console for network errors

### Right-click menu not working

- Refresh the page after installing the extension
- Check that the extension has necessary permissions
- Try reloading the extension in `chrome://extensions/`

## Permissions

The extension requires:
- `contextMenus`: For right-click menu
- `activeTab`: To access current tab content
- `storage`: To cache verification results
- `scripting`: To inject content scripts
- `<all_urls>`: To work on any website

## Support

For issues or questions:
- GitHub Issues: https://github.com/Osiyomeoh/TruthChain/issues
- Check the main README: https://github.com/Osiyomeoh/TruthChain

