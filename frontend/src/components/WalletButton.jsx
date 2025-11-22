import React from 'react'
import { ConnectButton } from '@mysten/dapp-kit'
import './WalletButton.css'

/**
 * WalletButton using dapp-kit's ConnectButton
 * 
 * This automatically shows:
 * - All available Sui wallets (Sui Wallet, Suiet, Ethos, Martian, etc.)
 * - Wallet selection modal when clicking "Connect Wallet"
 * - Connected wallet info and disconnect option when connected
 * 
 * Why not Rainbow Kit?
 * - Sui is NOT EVM-compatible (not Ethereum-based)
 * - Rainbow Kit only works with EVM chains (Ethereum, Polygon, etc.)
 * - Sui uses the Wallet Standard, not EIP-6963/WalletConnect
 * - dapp-kit is the official Sui wallet connection library
 */
function WalletButton() {
  return (
    <div className="wallet-button-wrapper">
      <ConnectButton 
        connectText="Connect Wallet"
      />
    </div>
  )
}

export default WalletButton

