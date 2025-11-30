import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client'
import { SUI_NETWORK } from '../config/api'

let suiClient = null

export function getSuiClient() {
  if (!suiClient) {
    const network = SUI_NETWORK || 'testnet'
    suiClient = new SuiClient({
      url: network === 'testnet' 
        ? getFullnodeUrl('testnet')
        : getFullnodeUrl('mainnet')
    })
  }
  return suiClient
}


