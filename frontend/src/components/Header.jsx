import React from 'react'
import WalletButton from './WalletButton'
import ThemeToggle from './ThemeToggle'
import './Header.css'

function Header() {

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <img src="/icons/truthchain-icon-blue.png" alt="TruthChain" className="logo-icon" />
          <span className="logo-text">TruthChain</span>
        </div>
        <nav className="nav">
          <a href="#features">Features</a>
          <a href="#register">Register</a>
          <a href="#verify">Verify</a>
          <a href="#extension">Extension</a>
          <ThemeToggle />
          <WalletButton />
        </nav>
      </div>
    </header>
  )
}

export default Header

