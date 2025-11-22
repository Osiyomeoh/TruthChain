import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui.js/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SUI_NETWORK } from '../config/api'

const queryClient = new QueryClient()

export default function WalletProviderWrapper({ children }) {
  // Get network from environment or default to testnet
  const defaultNetwork = SUI_NETWORK || 'testnet';
  
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={{
        testnet: { url: getFullnodeUrl('testnet') },
        mainnet: { url: getFullnodeUrl('mainnet') },
        devnet: { url: getFullnodeUrl('devnet') },
        localnet: { url: 'http://localhost:9000' }
      }} defaultNetwork={defaultNetwork}>
        <WalletProvider autoConnect={false}>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}
