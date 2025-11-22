import { Transaction } from '@mysten/sui/transactions'

/**
 * Convert hex string to bytes array
 */
function hexToBytes(hex) {
  const bytes = []
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16))
  }
  return bytes
}

/**
 * Register media on-chain using wallet
 * Returns a Transaction ready to be signed
 */
export function registerMediaWithWallet(data, config) {
  if (!config) {
    throw new Error('Contract configuration is required. Please ensure the backend is running and config endpoint is accessible.')
  }

  const PACKAGE_ID = config.packageId
  const REGISTRY_OBJECT_ID = config.registryObjectId

  if (!PACKAGE_ID || !REGISTRY_OBJECT_ID) {
    throw new Error('PACKAGE_ID and REGISTRY_OBJECT_ID must be configured. Please check your backend configuration.')
  }

  const { hash, walrusBlobId, source, mediaType, isAiGenerated, metadata } = data

  // Convert hash to bytes (32 bytes for SHA-256)
  const hashBytes = hexToBytes(hash)

  if (hashBytes.length !== 32) {
    throw new Error(`Invalid hash length: expected 32 bytes, got ${hashBytes.length}`)
  }

  // Create transaction
  const tx = new Transaction()

  // Get Clock object (required for timestamp)
  const clock = tx.object('0x6') // Sui Clock object ID

  // Convert strings to bytes
  const walrusBlobIdBytes = Array.from(new TextEncoder().encode(walrusBlobId))
  const sourceBytes = Array.from(new TextEncoder().encode(source))
  const mediaTypeBytes = Array.from(new TextEncoder().encode(mediaType))
  const metadataBytes = Array.from(new TextEncoder().encode(metadata || '{}'))

  // Call register_media function
  // For Transaction API, use type names with tx.pure
  tx.moveCall({
    target: `${PACKAGE_ID}::media_attestation::register_media`,
    arguments: [
      tx.pure('vector<u8>', hashBytes), // media_hash: vector<u8>
      tx.pure('vector<u8>', walrusBlobIdBytes), // walrus_blob_id: vector<u8>
      tx.pure('vector<u8>', sourceBytes), // source: vector<u8>
      tx.pure('vector<u8>', mediaTypeBytes), // media_type: vector<u8>
      tx.pure('bool', isAiGenerated), // is_ai_generated: bool
      tx.pure('vector<u8>', metadataBytes), // metadata: vector<u8>
      tx.object(REGISTRY_OBJECT_ID), // registry: &mut AttestationRegistry
      clock, // clock: &Clock
    ],
  })

  return tx
}

