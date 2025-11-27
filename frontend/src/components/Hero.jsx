import React from 'react'
import './Hero.css'
import './Button.css'

function Hero() {
  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            Verify Media Authenticity
            <span className="hero-title-gradient"> on Sui Blockchain</span>
          </h1>
          <p className="hero-description">
            Verify images and videos on social media platforms instantly. TruthChain provides 
            decentralized, provable authenticity verification for any media using Walrus 
            and Sui blockchain. Stop deepfakes and misinformation at the source.
          </p>
          <div className="hero-buttons">
            <a href="#extension" className="btn btn-primary">
              Download Extension
            </a>
            <a href="#verify" className="btn btn-secondary">
              Verify Media
            </a>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-image-wrapper">
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop&crop=face&auto=format&q=80" 
              alt="Verified Celebrity Media" 
              className="hero-celebrity-image"
              loading="lazy"
            />
            <div className="hero-image-overlay"></div>
          </div>
          <div className="hero-badge">
            <span className="badge-icon">✓</span>
            <span>Verified on Sui</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero

