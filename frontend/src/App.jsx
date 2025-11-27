import React, { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import Hero from './components/Hero'
import RegisterSection from './components/RegisterSection'
import VerifySection from './components/VerifySection'
import DecryptSection from './components/DecryptSection'
import ExtensionSection from './components/ExtensionSection'
import FeaturesSection from './components/FeaturesSection'
import Footer from './components/Footer'
import Terms from './components/Terms'

function App() {
  const [showTerms, setShowTerms] = useState(false)

  useEffect(() => {
    // Check if we should show terms based on hash
    const hash = window.location.hash
    if (hash === '#terms' || hash === '#terms-and-conditions') {
      setShowTerms(true)
    } else {
      setShowTerms(false)
    }

    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash
      if (newHash === '#terms' || newHash === '#terms-and-conditions') {
        setShowTerms(true)
        window.scrollTo(0, 0)
      } else {
        setShowTerms(false)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (showTerms) {
    return (
      <div className="app">
        <Header />
        <Terms />
        <Footer />
      </div>
    )
  }

  return (
    <div className="app" id="home">
      <Header />
      <main>
        <Hero />
        <FeaturesSection />
        <RegisterSection />
        <VerifySection />
        <DecryptSection />
        <ExtensionSection />
      </main>
      <Footer />
    </div>
  )
}

export default App

