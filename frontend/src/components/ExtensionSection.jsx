import React from 'react'
import { API_BASE } from '../config/api'
import './ExtensionSection.css'
import './Button.css'

function ExtensionSection() {
  return (
    <section id="extension" className="extension-section">
      <div className="extension-container">
        <h2 className="section-title">Browser Extension</h2>
        <p className="section-description">
          Install the TruthChain extension to verify media instantly on social media platforms 
          and websites. Works on Twitter, Instagram, Facebook, TikTok, LinkedIn, and more.
        </p>

        <div className="extension-content">
          <div className="extension-info">
            <div className="extension-feature">
              <div className="feature-icon">Social</div>
              <h3>Social Media Ready</h3>
              <p>Works seamlessly on Twitter, Instagram, Facebook, TikTok, and all major platforms</p>
            </div>
            <div className="extension-feature">
              <div className="feature-icon">Auto</div>
              <h3>Auto-Verification</h3>
              <p>Automatically verifies images and videos as you scroll through social feeds</p>
            </div>
            <div className="extension-feature">
              <div className="feature-icon">Click</div>
              <h3>Right-Click Menu</h3>
              <p>Right-click any media on social platforms to verify or register instantly</p>
            </div>
          </div>

          <div className="extension-download">
            <div className="download-card">
              <img src="/icons/truthchain-icon-blue.png" alt="TruthChain" className="extension-icon" />
              <h3>TruthChain Extension</h3>
              <p>Available for Chrome and Edge</p>
              
              <div className="download-instructions">
                <h4>Installation Steps:</h4>
                <ol>
                  <li>
                    <strong>Download:</strong> Click "Download Extension (ZIP)" button above
                  </li>
                  <li>
                    <strong>Extract:</strong> Extract the downloaded ZIP file. You'll see a <code>browser-extension</code> folder inside.
                  </li>
                  <li>
                    <strong>Open Chrome:</strong> Go to <code>chrome://extensions/</code> (or <code>edge://extensions/</code> for Edge)
                  </li>
                  <li>
                    <strong>Enable Developer Mode:</strong> Toggle "Developer mode" in the top-right corner
                  </li>
                  <li>
                    <strong>Load Extension:</strong> Click "Load unpacked" and select the <code>browser-extension</code> folder (the one containing <code>manifest.json</code>)
                  </li>
                  <li>
                    <strong>Done!</strong> The TruthChain icon should appear in your browser toolbar. Start browsing to see verification badges!
                  </li>
                </ol>
                <div className="installation-note">
                  <strong>Note:</strong> The extension works on all websites including Twitter, Instagram, Facebook, TikTok, and LinkedIn.
                </div>
              </div>

              <div className="download-buttons">
                <a 
                  href={`${API_BASE.replace('/v1', '/v1/extension/download')}`}
                  className="btn btn-primary"
                  download="truthchain-extension.zip"
                >
                  Download Extension (ZIP)
                </a>
                <a 
                  href="https://github.com/Osiyomeoh/TruthChain" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="sui-info">
          <h3>Powered by Sui Blockchain</h3>
          <p>
            TruthChain leverages Sui's high-performance blockchain to store media attestations 
            immutably. Every verification is recorded on-chain, ensuring permanent authenticity records.
          </p>
          <div className="sui-features">
            <div className="sui-feature">
              <strong>Fast Transactions</strong>
              <p>Sui's parallel execution enables instant attestation creation</p>
            </div>
            <div className="sui-feature">
              <strong>Low Costs</strong>
              <p>Efficient gas model makes verification affordable</p>
            </div>
            <div className="sui-feature">
              <strong>Immutable Records</strong>
              <p>Once registered, attestations cannot be altered</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ExtensionSection

