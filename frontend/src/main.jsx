import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext'
import WalletProvider from './components/WalletProvider.jsx'
import '@mysten/dapp-kit/dist/index.css'
import './index.css'
// Start keep-alive service to prevent Render from spinning down
import './services/keepAlive.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </ThemeProvider>
  </React.StrictMode>,
)

