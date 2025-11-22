import React from 'react'
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
                  <li>Download the extension from the repository</li>
                  <li>Open Chrome/Edge and go to <code>chrome://extensions/</code></li>
                  <li>Enable "Developer mode" (toggle in top-right)</li>
                  <li>Click "Load unpacked"</li>
                  <li>Select the <code>browser-extension</code> folder</li>
                </ol>
              </div>

              <a 
                href="https://github.com/yourusername/truthchain" 
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Download Extension
              </a>
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

