# Sui Wallet Integration

## Why Not Rainbow Kit?

**Rainbow Kit is for EVM chains only** (Ethereum, Polygon, Arbitrum, etc.). Sui is **NOT EVM-compatible**, so Rainbow Kit won't work.

### Key Differences:

| Feature | EVM Chains (Rainbow Kit) | Sui (dapp-kit) |
|---------|-------------------------|----------------|
| **Blockchain Type** | EVM-compatible | Move-based, non-EVM |
| **Wallet Standard** | EIP-6963 / WalletConnect | Wallet Standard |
| **Popular Wallets** | MetaMask, Coinbase, Rainbow | Sui Wallet, Suiet, Ethos |
| **Connection Library** | Rainbow Kit, Wagmi | @mysten/dapp-kit |

## Supported Sui Wallets

The `@mysten/dapp-kit` library automatically detects and supports:

1. **Sui Wallet** (Official) - Browser extension
2. **Suiet** - Browser extension
3. **Ethos Wallet** - Browser extension
4. **Martian Wallet** - Browser extension
5. **Glass Wallet** - Browser extension
6. **Any wallet implementing the Sui Wallet Standard**

## How It Works

When users click "Connect Wallet", dapp-kit's `ConnectButton` component:
1. Scans for installed Sui wallet extensions
2. Shows a modal with all available wallets
3. Handles connection automatically
4. Manages wallet state and account switching

## Installation

Users need to install a Sui wallet extension:
- **Sui Wallet**: https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil
- **Suiet**: https://suiet.app/
- **Ethos**: https://ethoswallet.xyz/

The ConnectButton will automatically detect which wallets are installed.

