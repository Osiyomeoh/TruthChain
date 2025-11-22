import React from 'react'
import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h4>TruthChain</h4>
            <p>Provably authentic media verification on Sui blockchain</p>
          </div>
          <div className="footer-section">
            <h4>Technology</h4>
            <ul>
              <li><a href="https://sui.io" target="_blank" rel="noopener noreferrer">Sui Blockchain</a></li>
              <li><a href="https://walrus.xyz" target="_blank" rel="noopener noreferrer">Walrus Storage</a></li>
              <li><a href="https://seal.xyz" target="_blank" rel="noopener noreferrer">Seal Proofs</a></li>
              <li><a href="https://nautilus.xyz" target="_blank" rel="noopener noreferrer">Nautilus Search</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><a href="#extension">Download Extension</a></li>
              <li><a href="#register">Register Media</a></li>
              <li><a href="#verify">Verify Media</a></li>
              <li><a href="https://github.com/yourusername/truthchain" target="_blank" rel="noopener noreferrer">GitHub</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 TruthChain. Built for Walrus Haulout Hackathon.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer

