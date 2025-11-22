import React, { useState } from 'react'
import './App.css'
import Header from './components/Header'
import Hero from './components/Hero'
import RegisterSection from './components/RegisterSection'
import VerifySection from './components/VerifySection'
import ExtensionSection from './components/ExtensionSection'
import FeaturesSection from './components/FeaturesSection'
import Footer from './components/Footer'

function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Hero />
        <FeaturesSection />
        <RegisterSection />
        <VerifySection />
        <ExtensionSection />
      </main>
      <Footer />
    </div>
  )
}

export default App

